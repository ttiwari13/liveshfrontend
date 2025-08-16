// Enhanced FileEditorPage.js with better socket handling for notifications

import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from 'socket.io-client';
import { 
  Play, 
  Share2, 
  File, 
  Folder, 
  Copy, 
  Download,
  Menu,
  X,
  Save,
  Upload,
  RefreshCw,
  Link,
  ExternalLink,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  User,
  Wifi,
  WifiOff
} from "lucide-react";

const FileEditorPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState("");
  const [isSharedView, setIsSharedView] = useState(false);
  const [shareLink, setShareLink] = useState("");
  
  // Enhanced notification states for change approval
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [processingChange, setProcessingChange] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  
  // User info - determine role based on URL
  const [currentUser, setCurrentUser] = useState({ 
    id: 'user123', 
    name: 'Current User',
    role: params.sharedId ? 'collaborator' : 'owner' // Auto-detect role
  });

  const API_BASE = "https://livesh.onrender.com/api/files";

  // Enhanced socket connection with better error handling and reconnection
  useEffect(() => {
    console.log('🔌 Setting up socket connection...');
    
    const socketConnection = io("https://livesh.onrender.com", {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
      forceNew: true
    });
    
    setSocket(socketConnection);

    // Connection status handlers
    socketConnection.on('connect', () => {
      console.log('✅ Socket connected successfully:', socketConnection.id);
      setSocketConnected(true);
      
      // Identify user to server
      socketConnection.emit('identify', {
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        shareId: params.sharedId
      });
      
      // Join appropriate rooms
      if (currentUser.role === 'owner') {
        socketConnection.emit('join-room', { role: 'owner' });
      }
      
      if (params.sharedId) {
        socketConnection.emit('join-room', { shareId: params.sharedId, role: currentUser.role });
      }
    });

    socketConnection.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setSocketConnected(false);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('🚨 Socket connection error:', error);
      setSocketConnected(false);
    });

    socketConnection.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setSocketConnected(true);
    });

    socketConnection.on('reconnect_error', (error) => {
      console.error('🔄❌ Socket reconnection failed:', error);
    });

    // Enhanced change request listeners
    socketConnection.on("change-pending", (data) => {
      console.log("📬 Received change-pending notification:", data);
      
      // Show notifications to OWNER only
      if (currentUser.role === 'owner') {
        console.log('👨‍💼 Adding notification for owner');
        setNotifications((prev) => {
          // Check if notification already exists to prevent duplicates
          const existingNotif = prev.find(n => n.changeId === data.id);
          if (existingNotif) {
            console.log('⚠️ Notification already exists, skipping duplicate');
            return prev;
          }
          
          const newNotification = {
            id: Date.now(),
            type: 'change-pending',
            message: data.message || `${data.collaboratorName} wants to save changes to ${data.fileName}`,
            collaboratorName: data.collaboratorName,
            fileName: data.fileName,
            fileId: data.fileId,
            changeId: data.id,
            changes: data.changes,
            timestamp: new Date().toISOString(),
            shareId: data.shareId
          };
          
          console.log('➕ Adding new notification:', newNotification);
          return [newNotification, ...prev];
        });

        // Show browser notification if page is not focused
        if (!document.hasFocus() && Notification.permission === 'granted') {
          new Notification(`Change Request from ${data.collaboratorName}`, {
            body: `Wants to save changes to ${data.fileName}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `change-${data.id}` // Prevent duplicate notifications
          });
        }
        
        // Play notification sound (optional)
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdBSuR2O3AcCEE');
          audio.volume = 0.3;
          audio.play().catch(() => {}); // Ignore if autoplay is blocked
        } catch (e) {
          // Ignore audio errors
        }
      } else {
        console.log('🤝 User is collaborator, not showing owner notification');
      }
    });

    // Listen for owner-specific notifications
    socketConnection.on("owner-change-request", (data) => {
      console.log("👨‍💼 Received owner-specific change request:", data);
      if (currentUser.role === 'owner') {
        // Handle owner-specific notifications
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'change-pending',
            message: `🔔 ${data.collaboratorName} requests approval`,
            collaboratorName: data.collaboratorName,
            fileName: data.fileName,
            fileId: data.fileId,
            changeId: data.id,
            changes: data.changes,
            timestamp: new Date().toISOString(),
            shareId: data.shareId,
            priority: 'high'
          },
          ...prev,
        ]);
      }
    });

    // Listen for change approval/rejection responses
    socketConnection.on("change-approved", (data) => {
      console.log("✅ Change approved and applied:", data);
      
      // Update file content if it's the currently selected file
      if (selectedFile === data.fileId) {
        setFileContent(data.newContent);
      }
      
      // Remove the notification from the list (for owner)
      setNotifications((prev) => prev.filter((n) => n.changeId !== data.changeId));
      
      // Show success message to collaborator
      if (currentUser.role === 'collaborator') {
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'approval-success',
            message: `✅ Your changes to ${data.fileName} have been approved!`,
            timestamp: new Date().toISOString(),
            isSuccess: true
          },
          ...prev,
        ]);
      }

      // Update files list
      setFiles(prev => prev.map(f => 
        (f._id || f.id) === data.fileId ? { ...f, content: data.newContent } : f
      ));
    });

    socketConnection.on("change-rejected", (data) => {
      console.log("❌ Change was rejected:", data);
      
      // Revert file content if it's the currently selected file
      if (selectedFile === data.fileId) {
        setFileContent(data.originalContent);
      }
      
      // Remove the notification from the list (for owner)
      setNotifications((prev) => prev.filter((n) => n.changeId !== data.changeId));
      
      // Show rejection message to collaborator
      if (currentUser.role === 'collaborator') {
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'rejection-info',
            message: `❌ Your changes to ${data.fileName} were declined`,
            timestamp: new Date().toISOString(),
            isInfo: true
          },
          ...prev,
        ]);
      }
    });

    // Listen for real-time file updates
    socketConnection.on("file-changed", (data) => {
      if (data.type === "update") {
        console.log("📝 File updated:", data);
        
        // Update files list
        setFiles(prev => prev.map(f => 
          (f._id || f.id) === data.file._id ? { ...f, ...data.file } : f
        ));
        
        // Show success notification
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'file-updated',
            message: `📝 File "${data.file.name}" has been updated`,
            timestamp: new Date().toISOString(),
            isSuccess: true
          },
          ...prev,
        ]);
      }
    });

    // Debug listeners
    socketConnection.on("debug-notification", (data) => {
      console.log("🐛 Debug notification received:", data);
    });

    socketConnection.on("server-ping", (data) => {
      console.log("🏓 Server ping received:", data);
    });

    // Test connection
    socketConnection.on("pong-test", (data) => {
      console.log("🏓 Pong received:", data);
    });

    // Send a test ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (socketConnection.connected) {
        socketConnection.emit('ping-test', { 
          message: 'Client ping', 
          timestamp: new Date(),
          userRole: currentUser.role 
        });
      }
    }, 30000);

    return () => {
      console.log('🧹 Cleaning up socket connection');
      clearInterval(pingInterval);
      
      if (socketConnection) {
        // Leave rooms before disconnecting
        if (currentUser.role === 'owner') {
          socketConnection.emit('leave-room', { role: 'owner' });
        }
        if (params.sharedId) {
          socketConnection.emit('leave-room', { shareId: params.sharedId });
        }
        
        socketConnection.disconnect();
      }
    };
  }, [selectedFile, currentUser.role, params.sharedId]);

  // Update user role when URL changes
  useEffect(() => {
    const newRole = params.sharedId ? 'collaborator' : 'owner';
    setCurrentUser(prev => ({ ...prev, role: newRole }));
    setIsSharedView(!!params.sharedId);
    console.log('👤 User role updated to:', newRole);
  }, [params.sharedId]);

  // Request notification permission on component mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-remove success/info notifications after 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifications((prev) => 
        prev.filter((n) => {
          const age = Date.now() - new Date(n.timestamp).getTime();
          if ((n.isSuccess || n.isInfo) && age > 5000) {
            return false;
          }
          return true;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Axios config
  useEffect(() => {
    axios.defaults.timeout = 10000;
  }, []);

  const generateFileKey = (file, index) => `${file._id || file.id || file.name}-${index}`;

  const loadFiles = async (parentId = "") => {
    try {
      setLoading(true);
      let url = API_BASE;
      if (parentId) url += `?parentId=${parentId}`;
      
      url += (url.includes('?') ? '&' : '?') + 'timestamp=' + Date.now();
      
      console.log('Loading files from:', url);
      const { data } = await axios.get(url);
      console.log('Files response:', data);
      
      setFiles(data.files || []);
      setSelectedFile(null);
      
      if (data.files && data.files.length > 0) {
        const firstFile = data.files.find(f => !f.isFolder);
        if (firstFile) {
          setSelectedFile(firstFile._id || firstFile.id);
        }
      }
    } catch (err) {
      console.error("Failed to load files:", err);
      setFiles([]);
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'error',
          message: '❌ Failed to load files. Please check your connection.',
          timestamp: new Date().toISOString(),
          isError: true
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedFiles = async (sharedId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/shared/${sharedId}`);
      console.log('Shared files response:', response.data);
      
      setFiles(response.data.files || []);
      setIsSharedView(true);

      if (response.data.files.length > 0) {
        const firstFile = response.data.files.find(f => !f.isFolder);
        if (firstFile) setSelectedFile(firstFile._id || firstFile.id);
      }
    } catch (err) {
      console.error('Failed to load shared files:', err);
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'error',
          message: err.response?.data?.message || '❌ Failed to load shared files',
          timestamp: new Date().toISOString(),
          isError: true
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize files
  useEffect(() => {
    const sharedId = params.sharedId;
    console.log('FileEditorPage mounted, sharedId:', sharedId, 'currentFolderId:', currentFolderId);
    
    if (sharedId) {
      loadSharedFiles(sharedId);
    } else {
      loadFiles(currentFolderId);
    }
  }, [params.sharedId, currentFolderId]);

  useEffect(() => {
    console.log('Location changed:', location.pathname, location.search);
    if (!params.sharedId) {
      const urlParams = new URLSearchParams(location.search);
      if (urlParams.get('refresh')) {
        console.log('Detected refresh from upload, forcing reload...');
        setFiles([]);
        setSelectedFile(null);
        setTimeout(() => loadFiles(currentFolderId), 100);
      }
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!selectedFile) return;
    const fileObj = files.find(f => (f._id || f.id) === selectedFile);
    if (fileObj && !fileObj.isFolder) {
      setFileContent(fileObj.content || "");
      detectLanguage(fileObj.name);
    }
  }, [selectedFile, files]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuOpen && !event.target.closest('.share-dropdown')) {
        setShareMenuOpen(false);
      }
      if (notifOpen && !event.target.closest('.notification-dropdown')) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareMenuOpen, notifOpen]);

  const detectLanguage = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const langMap = {
      js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
      html: "html", css: "css", json: "json", md: "markdown",
      py: "python", java: "java", cpp: "cpp", c: "c", cs: "csharp",
      php: "php", go: "go", rs: "rust", rb: "ruby", vue: "vue", svelte: "svelte",
      exe: "executable",
    };
    setLanguage(langMap[ext] || "plaintext");
  };

  // Enhanced save function that uses the dedicated endpoint
  const handleSave = async () => {
    if (!selectedFile) return;

    const selectedFileObj = files.find(f => (f._id || f.id) === selectedFile);
    if (!selectedFileObj) return;

    // If user is a collaborator in shared view, use the dedicated request-change endpoint
    if (isSharedView && currentUser.role === 'collaborator') {
      try {
        setSaving(true);
        
        console.log('📤 Sending change request...', {
          fileId: selectedFile,
          newContent: fileContent,
          collaboratorName: currentUser.name,
          fileName: selectedFileObj.name,
          shareId: params.sharedId
        });
        
        const response = await axios.post(`${API_BASE}/request-change`, {
          fileId: selectedFile,
          newContent: fileContent,
          collaboratorName: currentUser.name,
          fileName: selectedFileObj.name,
          shareId: params.sharedId
        });

        console.log('✅ Change request sent successfully:', response.data);
        
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'change-requested',
            message: `📤 Change request sent for ${selectedFileObj.name}. Waiting for approval...`,
            timestamp: new Date().toISOString(),
            isInfo: true
          },
          ...prev,
        ]);

      } catch (err) {
        console.error('❌ Failed to request change:', err);
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'error',
            message: err.response?.data?.message || '❌ Failed to request change',
            timestamp: new Date().toISOString(),
            isError: true
          },
          ...prev,
        ]);
      } finally {
        setSaving(false);
      }
    } else {
      // Normal save for owners or non-shared files
      try {
        setSaving(true);
        await axios.put(`${API_BASE}/${selectedFile}`, { content: fileContent });
        setFiles(prev => prev.map(f => (f._id || f.id) === selectedFile ? { ...f, content: fileContent } : f));
        
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'save-success',
            message: `✅ File ${selectedFileObj.name} saved successfully!`,
            timestamp: new Date().toISOString(),
            isSuccess: true
          },
          ...prev,
        ]);
      } catch (err) {
        console.error('❌ Failed to save file:', err);
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'error',
            message: err.response?.data?.message || '❌ Failed to save file',
            timestamp: new Date().toISOString(),
            isError: true
          },
          ...prev,
        ]);
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle change approval (for owners)
  const handleApproveChange = async (changeId) => {
    try {
      setProcessingChange(changeId);
      console.log('✅ Approving change:', changeId);
      
      const response = await axios.post(`${API_BASE}/approve-change/${changeId}`);
      console.log('Change approved:', response.data);
      
      // Remove the notification
      setNotifications(prev => prev.filter(n => n.changeId !== changeId));
      
      // Show success message
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'approval-success',
          message: '✅ Change approved successfully!',
          timestamp: new Date().toISOString(),
          isSuccess: true
        },
        ...prev,
      ]);
      
    } catch (err) {
      console.error('❌ Failed to approve change:', err);
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'error',
          message: '❌ Failed to approve change',
          timestamp: new Date().toISOString(),
          isError: true
        },
        ...prev,
      ]);
    } finally {
      setProcessingChange(null);
    }
  };

  // Handle change rejection (for owners)
  const handleRejectChange = async (changeId) => {
    try {
      setProcessingChange(changeId);
      console.log('❌ Rejecting change:', changeId);
      
      const response = await axios.post(`${API_BASE}/reject-change/${changeId}`);
      console.log('Change rejected:', response.data);
      
      // Remove the notification
      setNotifications(prev => prev.filter(n => n.changeId !== changeId));
      
      // Show info message
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'rejection-info',
          message: '❌ Change rejected',
          timestamp: new Date().toISOString(),
          isInfo: true
        },
        ...prev,
      ]);
      
    } catch (err) {
      console.error('❌ Failed to reject change:', err);
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'error',
          message: '❌ Failed to reject change',
          timestamp: new Date().toISOString(),
          isError: true
        },
        ...prev,
      ]);
    } finally {
      setProcessingChange(null);
    }
  };

  // Create share link
  const handleCreateShareLink = async () => {
    try {
      setSharing(true);
      const response = await axios.post(`${API_BASE}/share`, {
        folderId: currentFolderId || "root",
        type: "folder"
      });
      
      setShareLink(response.data.shareLink);
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'share-success',
          message: '🔗 Share link created successfully!',
          timestamp: new Date().toISOString(),
          isSuccess: true
        },
        ...prev,
      ]);
      
    } catch (err) {
      console.error('❌ Failed to create share link:', err);
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'error',
          message: '❌ Failed to create share link',
          timestamp: new Date().toISOString(),
          isError: true
        },
        ...prev,
      ]);
    } finally {
      setSharing(false);
    }
  };

  // Copy share link to clipboard
  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'copy-success',
          message: '📋 Share link copied to clipboard!',
          timestamp: new Date().toISOString(),
          isSuccess: true
        },
        ...prev,
      ]);
    } catch (err) {
      console.error('❌ Failed to copy:', err);
    }
  };

  const handleFileSelect = (fileId) => {
    const file = files.find(f => (f._id || f.id) === fileId);
    if (file && !file.isFolder) {
      setSelectedFile(fileId);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Count pending change notifications
  const pendingChangeCount = notifications.filter(n => n.type === 'change-pending').length;

  // Test socket connection
  const testSocketConnection = () => {
    if (socket && socket.connected) {
      socket.emit('ping-test', { 
        message: 'Manual test ping', 
        timestamp: new Date(),
        userRole: currentUser.role 
      });
      console.log('🏓 Test ping sent');
    } else {
      console.log('❌ Socket not connected');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-12'} transition-all duration-200 bg-gray-800 border-r border-gray-700 flex flex-col`}>
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className={`font-semibold ${!sidebarOpen && 'hidden'}`}>
              {isSharedView ? 'Shared Files' : 'Files'}
            </h2>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-center">
              <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
              <p className="text-sm text-gray-400">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-4 text-center">
              <FileText className="mx-auto mb-2 text-gray-400" size={20} />
              <p className="text-sm text-gray-400">No files found</p>
            </div>
          ) : (
            files.map((file, index) => (
              <div
                key={generateFileKey(file, index)}
                onClick={() => handleFileSelect(file._id || file.id)}
                className={`p-2 mx-2 my-1 rounded cursor-pointer flex items-center gap-2 hover:bg-gray-700 ${
                  selectedFile === (file._id || file.id) ? 'bg-blue-600' : ''
                }`}
              >
                {file.isFolder ? <Folder size={16} /> : <File size={16} />}
                {sidebarOpen && (
                  <span className="truncate text-sm">{file.name}</span>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Socket Connection Status (Debug Info) */}
        {sidebarOpen && (
          <div className="p-2 border-t border-gray-700 text-xs">
            <div className="flex items-center gap-2 mb-1">
              {socketConnected ? (
                <>
                  <Wifi size={12} className="text-green-400" />
                  <span className="text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-red-400" />
                  <span className="text-red-400">Disconnected</span>
                </>
              )}
            </div>
            <button
              onClick={testSocketConnection}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Test Connection
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">File Editor</h1>
            {isSharedView && (
              <span className="px-2 py-1 bg-blue-600 text-xs rounded">
                {currentUser.role === 'collaborator' ? '🤝 Collaborator' : '👨‍💼 Owner'} View
              </span>
            )}
            {selectedFile && (
              <span className="text-gray-400">
                {files.find(f => (f._id || f.id) === selectedFile)?.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Socket Status Indicator */}
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs">
              {socketConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400">Live</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-red-400">Offline</span>
                </>
              )}
            </div>

            {/* Notifications */}
            <div className="relative notification-dropdown">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2 rounded hover:bg-gray-700 relative ${
                  pendingChangeCount > 0 ? 'text-orange-400' : ''
                }`}
              >
                <Bell size={18} />
                {pendingChangeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                    {pendingChangeCount}
                  </span>
                )}
                {notifications.some(n => n.type === 'change-pending') && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></span>
                )}
              </button>
              
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
                  <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bell size={16} />
                      Notifications
                      {pendingChangeCount > 0 && (
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                          {pendingChangeCount} pending
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center">
                        <Bell className="mx-auto mb-2 text-gray-500" size={32} />
                        <p className="text-sm text-gray-400">No notifications</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Role: {currentUser.role} | Socket: {socketConnected ? 'Connected' : 'Disconnected'}
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 border-b border-gray-700 last:border-b-0 ${
                            notif.type === 'change-pending' ? 'bg-orange-900/20 border-l-4 border-l-orange-400' :
                            notif.isSuccess ? 'bg-green-900/20 border-l-4 border-l-green-400' :
                            notif.isError ? 'bg-red-900/20 border-l-4 border-l-red-400' :
                            notif.isInfo ? 'bg-blue-900/20 border-l-4 border-l-blue-400' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {notif.type === 'change-pending' && <AlertTriangle size={16} className="text-orange-400 mt-0.5 animate-pulse" />}
                            {notif.isSuccess && <CheckCircle size={16} className="text-green-400 mt-0.5" />}
                            {notif.isError && <XCircle size={16} className="text-red-400 mt-0.5" />}
                            {notif.isInfo && <Clock size={16} className="text-blue-400 mt-0.5" />}
                            
                            <div className="flex-1">
                              <p className="text-sm font-medium">{notif.message}</p>
                              {notif.collaboratorName && notif.type === 'change-pending' && (
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  <User size={12} />
                                  From: {notif.collaboratorName}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimestamp(notif.timestamp)}
                              </p>
                              
                              {notif.type === 'change-pending' && (
                                <div className="mt-3 space-y-2">
                                  {notif.changes && (
                                    <div className="p-2 bg-gray-900 rounded text-xs">
                                      <div className="text-gray-400 mb-1">Preview:</div>
                                      <div className="text-red-300 mb-1 line-clamp-2">- {notif.changes.from?.substring(0, 60)}...</div>
                                      <div className="text-green-300 line-clamp-2">+ {notif.changes.to?.substring(0, 60)}...</div>
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleApproveChange(notif.changeId)}
                                      disabled={processingChange === notif.changeId}
                                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle size={12} />
                                      {processingChange === notif.changeId ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => handleRejectChange(notif.changeId)}
                                      disabled={processingChange === notif.changeId}
                                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                      <XCircle size={12} />
                                      {processingChange === notif.changeId ? 'Rejecting...' : 'Reject'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Share Menu */}
            {!isSharedView && (
              <div className="relative share-dropdown">
                <button
                  onClick={() => setShareMenuOpen(!shareMenuOpen)}
                  className="p-2 rounded hover:bg-gray-700"
                >
                  <Share2 size={18} />
                </button>
                
                {shareMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-4">
                      <h3 className="font-semibold mb-3">Share Files</h3>
                      
                      {!shareLink ? (
                        <button
                          onClick={handleCreateShareLink}
                          disabled={sharing}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                        >
                          {sharing ? 'Creating...' : 'Create Share Link'}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-gray-700 rounded text-sm break-all">
                            {shareLink}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleCopyShareLink}
                              className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center justify-center gap-2"
                            >
                              <Copy size={14} />
                              {copied ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              onClick={() => window.open(shareLink, '_blank')}
                              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || !selectedFile || !socketConnected}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : (isSharedView && currentUser.role === 'collaborator' ? 'Request Save' : 'Save')}
            </button>
          </div>
        </header>

        {/* Editor */}
        <div className="flex-1 p-4">
          {selectedFile ? (
            <div className="h-full">
              <div className="mb-2 flex items-center gap-4 text-sm text-gray-400">
                <span>Language: {language}</span>
                {isSharedView && currentUser.role === 'collaborator' && (
                  <span className="text-orange-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Changes require owner approval
                  </span>
                )}
                <span className="text-xs">
                  Socket: {socketConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </span>
              </div>
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-full bg-gray-800 text-white p-4 rounded border border-gray-700 font-mono text-sm resize-none focus:outline-none focus:border-blue-500"
                placeholder="Start editing your file..."
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="mb-2">Select a file to start editing</p>
                <p className="text-xs text-gray-500">
                  Role: {currentUser.role} | Socket: {socketConnected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileEditorPage;