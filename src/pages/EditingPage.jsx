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
  User
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
  
  // 🔔 Enhanced notification states for change approval
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [processingChange, setProcessingChange] = useState(null);
  const [socket, setSocket] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(new Map());
  const [isCollaborator, setIsCollaborator] = useState(false);
  
  // User info - you'll need to implement this based on your auth system
  const [currentUser, setCurrentUser] = useState({ 
    id: 'user123', 
    name: 'Current User',
    role: 'collaborator' // 'owner' or 'collaborator'
  });

  const API_BASE = "https://livesh.onrender.com/api/files";

  // Enhanced socket connection for change approval workflow
  useEffect(() => {
    const socketConnection = io("http://localhost:5000");
    setSocket(socketConnection);

    // Listen for pending changes (when collaborator makes changes)
    socketConnection.on("change-pending", (data) => {
      console.log("Received change-pending:", data);
      
      // Only show notifications to the project owner
      if (currentUser.role === 'owner') {
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'change-pending',
            message: `${data.collaboratorName} wants to save changes to ${data.fileName}`,
            collaboratorName: data.collaboratorName,
            fileName: data.fileName,
            fileId: data.fileId,
            changeId: data.id,
            changes: data.changes,
            timestamp: new Date().toISOString(),
            shareId: data.shareId
          },
          ...prev,
        ]);

        // Show browser notification if page is not focused
        if (!document.hasFocus() && Notification.permission === 'granted') {
          new Notification(`Change Request from ${data.collaboratorName}`, {
            body: `Wants to save changes to ${data.fileName}`,
            icon: '/favicon.ico'
          });
        }
      }
    });

    // Listen for change approval/rejection responses
    socketConnection.on("change-approved", (data) => {
      console.log("Change approved and applied:", data);
      
      // Update file content if it's the currently selected file
      if (selectedFile === data.fileId) {
        setFileContent(data.newContent);
      }
      
      // Remove the notification from the list
      setNotifications((prev) => prev.filter((n) => n.changeId !== data.changeId));
      
      // Show success message to collaborator
      if (currentUser.role === 'collaborator') {
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'approval-success',
            message: `Your changes to ${data.fileName} have been approved!`,
            timestamp: new Date().toISOString(),
            isSuccess: true
          },
          ...prev,
        ]);
      }
    });

    socketConnection.on("change-rejected", (data) => {
      console.log("Change was rejected:", data);
      
      // Revert file content if it's the currently selected file
      if (selectedFile === data.fileId) {
        setFileContent(data.originalContent);
      }
      
      // Remove the notification from the list
      setNotifications((prev) => prev.filter((n) => n.changeId !== data.changeId));
      
      // Show rejection message to collaborator
      if (currentUser.role === 'collaborator') {
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'rejection-info',
            message: `Your changes to ${data.fileName} were declined`,
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
        console.log("File updated:", data);
        
        // Update files list
        setFiles(prev => prev.map(f => 
          (f._id || f.id) === data.file._id ? { ...f, ...data.file } : f
        ));
        
        // Show success notification
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'file-updated',
            message: `File "${data.file.name}" has been updated`,
            timestamp: new Date().toISOString(),
            isSuccess: true
          },
          ...prev,
        ]);
      }
    });

    // Listen for collaboration status
    socketConnection.on("collaboration-status", (data) => {
      setIsCollaborator(data.isCollaborator);
      if (data.pendingChanges) {
        setPendingChanges(new Map(data.pendingChanges));
      }
    });

    return () => socketConnection.disconnect();
  }, [selectedFile, currentUser]);

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
      alert("Failed to load files. Please check your backend connection.");
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
      alert(err.response?.data?.message || err.message || 'Failed to load shared files');
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
      setCurrentUser(prev => ({ ...prev, role: 'collaborator' }));
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

  // Enhanced save function for change approval workflow
  const handleSave = async () => {
    if (!selectedFile) return;

    const selectedFileObj = files.find(f => (f._id || f.id) === selectedFile);
    if (!selectedFileObj) return;

    // If user is a collaborator in shared view, request approval
    if (isSharedView && currentUser.role === 'collaborator') {
      try {
        setSaving(true);
        
        const response = await axios.post(`${API_BASE}/request-change`, {
          fileId: selectedFile,
          newContent: fileContent,
          collaboratorName: currentUser.name,
          fileName: selectedFileObj.name,
          shareId: params.sharedId
        });

        console.log('Change request sent:', response.data);
        
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: 'change-requested',
            message: `Change request sent for ${selectedFileObj.name}. Waiting for approval...`,
            timestamp: new Date().toISOString(),
            isInfo: true
          },
          ...prev,
        ]);

        // Emit socket event for real-time notification
        if (socket) {
          socket.emit('change-requested', {
            fileId: selectedFile,
            fileName: selectedFileObj.name,
            collaboratorName: currentUser.name,
            changes: {
              from: selectedFileObj.content,
              to: fileContent
            },
            shareId: params.sharedId
          });
        }

      } catch (err) {
        console.error('Failed to request change:', err);
        alert(err.response?.data?.message || err.message || 'Failed to request change');
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
            message: `File ${selectedFileObj.name} saved successfully!`,
            timestamp: new Date().toISOString(),
            isSuccess: true
          },
          ...prev,
        ]);
      } catch (err) {
        console.error('Failed to save file:', err);
        alert(err.response?.data?.message || err.message || 'Failed to save file');
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle change approval
  const handleAccept = async (notificationId, changeId) => {
    if (!changeId) {
      console.error("No changeId provided for approval");
      return;
    }

    try {
      setProcessingChange(changeId);
      
      const response = await axios.post(
        `${API_BASE}/approve-change/${changeId}`
      );
      
      console.log("Change approved:", response.data);
      
      // Show success message
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'approval-success',
          message: `Changes approved and applied successfully!`,
          timestamp: new Date().toISOString(),
          isSuccess: true
        },
        ...prev.filter((n) => n.id !== notificationId)
      ]);
      
      // Refresh files to get updated content
      if (params.sharedId) {
        loadSharedFiles(params.sharedId);
      } else {
        loadFiles(currentFolderId);
      }
      
    } catch (error) {
      console.error("Failed to approve change:", error);
      alert('Failed to approve changes: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingChange(null);
    }
  };

  const handleDecline = async (notificationId, changeId) => {
    if (!changeId) {
      console.error("No changeId provided for rejection");
      return;
    }

    try {
      setProcessingChange(changeId);
      
      const response = await axios.post(
        `${API_BASE}/reject-change/${changeId}`
      );
      
      console.log("Change rejected:", response.data);
      
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'rejection-info',
          message: `Changes rejected and reverted`,
          timestamp: new Date().toISOString(),
          isInfo: true
        },
        ...prev.filter((n) => n.id !== notificationId)
      ]);
      
    } catch (error) {
      console.error("Failed to reject change:", error);
      alert('Failed to reject changes: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingChange(null);
    }
  };

  const handleShare = async () => {
    if (isSharedView) {
      alert('Cannot create share links in shared view');
      return;
    }

    try {
      setSharing(true);
      let shareId;
      
      if (currentFolderId) {
        shareId = currentFolderId;
      } else {
        shareId = 'root';
      }
      
      console.log('Creating share link for:', shareId);
      
      const response = await axios.post(`${API_BASE}/share`, {
        folderId: shareId,
        type: 'folder'
      });
      
      console.log('Share response:', response.data);
      
      if (response.data && response.data.shareLink) {
        const fullShareLink = `${window.location.origin}/editing/shared/${response.data.shareId}`;
        setShareLink(fullShareLink);
        
        await navigator.clipboard.writeText(fullShareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        
        alert('Share link created and copied to clipboard!');
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      console.error('Failed to create share link:', err);
      
      if (err.response?.status === 404) {
        alert('Folder not found. Please refresh and try again.');
      } else if (err.response?.status === 401) {
        alert('Unauthorized. Please log in again.');
      } else if (err.response?.status === 500) {
        alert('Server error. Please try again later.');
      } else if (err.name === 'NetworkError' || err.code === 'NETWORK_ERROR') {
        alert('Network error. Please check your connection.');
      } else {
        alert(err.response?.data?.message || err.message || 'Failed to create share link');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const uploadFiles = Array.from(event.target.files);
    if (!uploadFiles.length) return;

    try {
      setLoading(true);
      const formData = new FormData();
      uploadFiles.forEach(file => formData.append("files", file));
      if (currentFolderId) formData.append('parentId', currentFolderId);

      console.log('Uploading files via editor...');
      await axios.post(`${API_BASE}/upload-folder`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await loadFiles(currentFolderId);
      alert("Files uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      alert(err.response?.data?.message || err.message || "Failed to upload files");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    if (params.sharedId) {
      loadSharedFiles(params.sharedId);
    } else {
      loadFiles(currentFolderId);
    }
  };

  const handleDownload = () => {
    const selectedFileObj = files.find(f => (f._id || f.id) === selectedFile);
    if (!selectedFileObj) {
      alert('Please select a file to download');
      return;
    }
    
    try {
      const element = document.createElement("a");
      const file = new Blob([fileContent], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = selectedFileObj.name;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file');
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'change-pending':
        return <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />;
      case 'change-requested':
        return <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />;
      case 'file-updated':
        return <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />;
      case 'approval-success':
      case 'save-success':
        return <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />;
      case 'rejection-info':
        return <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return time.toLocaleDateString();
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const iconMap = {
      js: "🟨", jsx: "⚛️", ts: "🔷", tsx: "⚛️", html: "🌐",
      css: "🎨", json: "📋", md: "📝", py: "🐍", java: "☕",
      cpp: "⚙️", c: "⚙️", cs: "🔷", php: "🐘", go: "🐹",
      rs: "🦀", rb: "💎", vue: "💚", svelte: "🧡", exe: "⚙️",
    };
    return iconMap[ext] || "📄";
  };

  const selectedFileObj = files.find(f => (f._id || f.id) === selectedFile);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 w-80 bg-gray-800 border-r border-gray-700 transition-transform duration-300 ease-in-out flex flex-col h-full`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">{isSharedView ? 'Shared Files' : 'Explorer'}</h2>
            {isSharedView && currentUser.role === 'collaborator' && (
              <span className="text-xs bg-yellow-600 px-2 py-1 rounded">Collaborator</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh} 
              className="p-2 hover:bg-gray-700 rounded-md transition-colors" 
              title="Refresh files"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {!isSharedView && (
              <label className="p-2 hover:bg-gray-700 rounded-md transition-colors cursor-pointer" title="Upload files">
                <Upload className="w-4 h-4 text-blue-400" />
                <input type="file" multiple onChange={handleFileUpload} className="hidden" webkitdirectory="" />
              </label>
            )}
            <div className="relative share-dropdown">
              <button 
                onClick={() => setShareMenuOpen(!shareMenuOpen)} 
                className={`p-2 hover:bg-gray-700 rounded-md transition-colors group relative ${sharing ? 'animate-pulse' : ''}`} 
                title="Share project"
                disabled={sharing}
              >
                <Share2 className={`w-4 h-4 ${sharing ? 'text-yellow-400' : 'text-blue-400'} group-hover:text-green-400`} />
              </button>
              {shareMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50">
                  <div className="py-1">
                    {!isSharedView && (
                      <button 
                        onClick={() => { 
                          handleShare(); 
                          setShareMenuOpen(false); 
                        }} 
                        disabled={sharing}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-600 transition-colors ${sharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Link className="w-4 h-4" /> 
                        {sharing ? 'Creating Link...' : 'Create Share Link'}
                      </button>
                    )}
                    {shareLink && (
                      <div className="px-3 py-2 border-t border-gray-600">
                        <div className="text-xs text-gray-400 mb-1">Share Link:</div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={shareLink} 
                            readOnly 
                            className="flex-1 bg-gray-700 text-xs p-1 rounded border-none outline-none"
                          />
                          <button 
                            onClick={handleCopyShareLink}
                            className="p-1 hover:bg-gray-600 rounded"
                            title="Copy link"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => { 
                        handleDownload(); 
                        setShareMenuOpen(false); 
                      }} 
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-600 transition-colors" 
                      disabled={!selectedFile}
                    >
                      <Download className="w-4 h-4" /> Download File
                    </button>
                    {copied && (
                      <div className="px-3 py-2 text-xs text-green-400 border-t border-gray-600">
                         Link copied to clipboard!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-700 rounded-md transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mb-2 mx-auto" />
                <p>Loading files...</p>
              </div>
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-1 pb-4">
              {files.map((file, index) => {
                const fileId = file._id || file.id;
                const isSelected = selectedFile === fileId;
                const uniqueKey = generateFileKey(file, index);
                const hasPendingChanges = pendingChanges.has(fileId);

                return (
                  <div 
                    key={uniqueKey} 
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all hover:bg-gray-700 ${
                      isSelected ? "bg-blue-600/20 border border-blue-500/50" : ""
                    }`} 
                    onClick={() => {
                      if (file.isFolder) {
                        setCurrentFolderId(fileId);
                        setSelectedFile(null);
                        loadFiles(fileId);
                      } else {
                        setSelectedFile(fileId);
                      }
                    }}
                  >
                    <span className="text-lg flex-shrink-0">{file.isFolder ? "📁" : getFileIcon(file.name)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {file.name}
                        {hasPendingChanges && (
                          <Clock className="w-3 h-3 text-orange-400" title="Has pending changes" />
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{file.isFolder ? "Folder" : "File"}</div>
                    </div>
                    {isSelected && !file.isFolder && <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <File className="w-8 h-8 mb-2" />
              <p className="text-sm text-center">No files found</p>
              <p className="text-xs mt-1 text-center">Upload files or check backend connection</p>
              <button 
                onClick={handleRefresh}
                className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-700 rounded-md transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            {selectedFileObj ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">{getFileIcon(selectedFileObj.name)}</span>
                <span className="font-medium text-sm">{selectedFileObj.name}</span>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded uppercase">{language}</span>
                {isSharedView && currentUser.role === 'collaborator' && (
                  <span className="text-xs bg-yellow-600 px-2 py-1 rounded">Read Only</span>
                )}
                {pendingChanges.has(selectedFile) && (
                  <span className="text-xs bg-orange-600 px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No file selected</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Enhanced Bell Notification Icon */}
            <div className="relative notification-dropdown">
              <button 
                onClick={() => setNotifOpen(!notifOpen)} 
                className="relative p-2 hover:bg-gray-700 rounded-md transition-colors"
              >
                <Bell className="w-5 h-5 text-blue-400 hover:text-secondary cursor-pointer transition" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
                {notifications.some(n => n.type === 'change-pending') && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Enhanced Notification dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 text-white rounded-lg shadow-xl z-50 max-h-96 overflow-hidden border border-gray-600">
                  {/* Header */}
                  <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {notifications.length > 0 && (
                      <button 
                        onClick={clearAllNotifications}
                        className="text-xs text-blue-400 hover:text-blue-300 transition"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center">
                        <Bell className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="border-b border-gray-700 last:border-b-0">
                          <div className="p-3">
                            <div className="flex items-start gap-3">
                              {getNotificationIcon(n)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-200 leading-relaxed">
                                  {n.message}
                                </p>
                                {n.collaboratorName && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    From: {n.collaboratorName}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatTimestamp(n.timestamp)}
                                </p>

                                {/* Action buttons for change-pending notifications */}
                                {n.type === 'change-pending' && (
                                  <div className="flex gap-2 mt-3">
                                    <button
                                      onClick={() => handleAccept(n.id, n.changeId)}
                                      disabled={processingChange === n.changeId}
                                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-xs rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      {processingChange === n.changeId ? 'Approving...' : 'Accept'}
                                    </button>
                                    <button
                                      onClick={() => handleDecline(n.id, n.changeId)}
                                      disabled={processingChange === n.changeId}
                                      className="flex items-center gap-1 px-3 py-1 bg-red-600 text-xs rounded hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      {processingChange === n.changeId ? 'Rejecting...' : 'Decline'}
                                    </button>
                                  </div>
                                )}

                                {/* Show change preview for pending changes */}
                                {n.type === 'change-pending' && n.changes && (
                                  <div className="mt-2 p-2 bg-gray-900 rounded text-xs">
                                    <div className="text-gray-400 mb-1">Changes:</div>
                                    <div className="text-red-300 mb-1">- {n.changes.from?.substring(0, 50)}...</div>
                                    <div className="text-green-300">+ {n.changes.to?.substring(0, 50)}...</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Icon */}
            <div className="flex items-center gap-2 px-2">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">{currentUser.name}</span>
              {currentUser.role === 'collaborator' && (
                <span className="text-xs bg-yellow-600 px-1 py-0.5 rounded">Collaborator</span>
              )}
            </div>

            {/* Save Button - Enhanced for different scenarios */}
            {selectedFile && (
              <button 
                onClick={handleSave} 
                disabled={saving || (isSharedView && currentUser.role === 'collaborator' && pendingChanges.has(selectedFile))} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSharedView && currentUser.role === 'collaborator'
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                title={
                  isSharedView && currentUser.role === 'collaborator'
                    ? 'Request changes (requires owner approval)'
                    : 'Save file'
                }
              >
                <Save className="w-4 h-4" /> 
                {saving ? 'Saving...' : 
                 isSharedView && currentUser.role === 'collaborator' ? 'Request Changes' : 'Save'}
                {isSharedView && currentUser.role === 'collaborator' && (
                  <AlertTriangle className="w-4 h-4 text-yellow-200" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1">
          {selectedFileObj && !selectedFileObj.isFolder ? (
            <div className="relative h-full">
              <textarea 
                value={fileContent} 
                onChange={(e) => setFileContent(e.target.value)} 
                readOnly={false}
                className="w-full h-full bg-gray-900 text-white p-4 resize-none outline-none border-none font-mono text-sm leading-relaxed" 
                style={{ 
                  fontFamily: "'JetBrains Mono', monospace", 
                  fontSize: '14px', 
                  lineHeight: '1.5', 
                  tabSize: 2 
                }} 
                placeholder={
                  isSharedView && currentUser.role === 'collaborator' 
                    ? "Edit and click 'Request Changes' to send changes for approval..." 
                    : "Start typing your code here..."
                } 
                spellCheck={false} 
              />
              
              {/* Overlay message for collaborators with pending changes */}
              {isSharedView && currentUser.role === 'collaborator' && pendingChanges.has(selectedFile) && (
                <div className="absolute top-4 right-4 bg-orange-600/90 text-white px-3 py-2 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Changes pending approval</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No file selected</h3>
                <p className="text-sm mb-4">Select a file from the sidebar to start editing</p>
                {isSharedView && currentUser.role === 'collaborator' && (
                  <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-600/30 rounded-lg max-w-md">
                    <p className="text-sm text-yellow-200">
                      💡 As a collaborator, your changes will need owner approval before being saved.
                    </p>
                  </div>
                )}
                {files.length === 0 && (
                  <button 
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    Refresh Files
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Status Bar */}
        <div className="bg-blue-600 text-white px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedFileObj && !selectedFileObj.isFolder && (
              <>
                <span>Ln 1, Col 1</span>
                <span>UTF-8</span>
                <span>{fileContent.split('\n').length} lines</span>
                <span>{fileContent.length} characters</span>
              </>
            )}
            {files.length > 0 && <span>{files.length} files loaded</span>}
            {isSharedView && <span>🔗 Shared View</span>}
            {currentUser.role === 'collaborator' && <span>👥 Collaborator Mode</span>}
            {notifications.filter(n => n.type === 'change-pending').length > 0 && (
              <span className="bg-orange-500 px-2 py-1 rounded">
                {notifications.filter(n => n.type === 'change-pending').length} pending approval{notifications.filter(n => n.type === 'change-pending').length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              loading ? 'bg-yellow-400' : 
              saving ? 'bg-orange-400' : 
              sharing ? 'bg-purple-400' :
              processingChange ? 'bg-blue-400' :
              'bg-green-400'
            }`}></span>
            <span>
              {loading ? 'Loading...' : 
               saving ? (isSharedView && currentUser.role === 'collaborator' ? 'Requesting changes...' : 'Saving...') : 
               sharing ? 'Creating share link...' :
               processingChange ? 'Processing change...' :
               'Ready'}
            </span>
            {socket && (
              <>
                <span className="mx-2">•</span>
                <span className="text-green-300">Connected</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileEditorPage;