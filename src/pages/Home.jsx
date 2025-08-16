import { useCallback, useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import { User, Bell, HomeIcon, History, Menu, X, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import MenuBar from '../components/MenuBar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toggle, setToggle] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 🔔 Enhanced notification states for change approval
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [processingChange, setProcessingChange] = useState(null);

  // Get current user info (you'll need to implement this based on your auth system)
  const [currentUser, setCurrentUser] = useState({ id: 'owner123', name: 'Project Owner' });

  // Enhanced socket connection for change approval workflow
  useEffect(() => {
    const socket = io("http://localhost:5000");

    // Listen for pending changes (when collaborator makes changes)
    socket.on("change-pending", (data) => {
      console.log("Received change-pending:", data);
      
      // Only show notifications to the project owner
      // In a real app, you'd check if current user is the owner of the shared project
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: 'change-pending',
          message: `${data.collaboratorName} wants to save changes to ${data.fileName}`,
          collaboratorName: data.collaboratorName,
          fileName: data.fileName,
          fileId: data.fileId,
          changeId: data.id, // This is the pending change ID from backend
          changes: data.changes,
          timestamp: new Date().toISOString(),
          shareId: data.shareId
        },
        ...prev,
      ]);

      // Show browser notification if page is not focused
      if (!document.hasFocus()) {
        new Notification(`Change Request from ${data.collaboratorName}`, {
          body: `Wants to save changes to ${data.fileName}`,
          icon: '/favicon.ico'
        });
      }
    });

    // Listen for change approval/rejection responses
    socket.on("change-approved", (data) => {
      console.log("Change approved and applied:", data);
      // Remove the notification from the list
      setNotifications((prev) => prev.filter((n) => n.changeId !== data.changeId));
    });

    socket.on("change-rejected", (data) => {
      console.log("Change was rejected:", data);
      // Remove the notification from the list
      setNotifications((prev) => prev.filter((n) => n.changeId !== data.changeId));
    });

    // Listen for real-time file updates (when changes are applied)
    socket.on("file-changed", (data) => {
      if (data.type === "update") {
        console.log("File updated:", data);
        // You could show a success notification here
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

    return () => socket.disconnect();
  }, [currentUser]);

  // Request notification permission on component mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleAccept = async (notificationId, changeId) => {
    if (!changeId) {
      console.error("No changeId provided for approval");
      return;
    }

    try {
      setProcessingChange(changeId);
      
      const response = await axios.post(
        `https://livesh.onrender.com/api/files/approve-change/${changeId}`
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
        `https://livesh.onrender.com/api/files/reject-change/${changeId}`
      );
      
      console.log("Change rejected:", response.data);
      
      // Show info message
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

  // Auto-remove success/info notifications after 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifications((prev) => 
        prev.filter((n) => {
          const age = Date.now() - new Date(n.timestamp).getTime();
          // Remove success/info notifications after 5 seconds
          if ((n.isSuccess || n.isInfo) && age > 5000) {
            return false;
          }
          return true;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    const formData = new FormData();
    acceptedFiles.forEach(file => formData.append("files", file));

    try {
      setLoading(true);
      setUploadProgress(0);
      console.log('Uploading files...', acceptedFiles.map(f => f.name));
      
      const response = await axios.post(
        "https://livesh.onrender.com/api/files/upload-folder",
        formData,
        { 
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        }
      );
      
      console.log('Upload response:', response.data);
      alert('Files uploaded successfully!');
      
      // Navigate to editor page with refresh parameter
      setTimeout(() => {
        navigate('/editing?refresh=true');
      }, 500);
      
    } catch (err) {
      console.error("Upload failed:", err);
      alert(err.response?.data?.message || err.message || 'Failed to upload files');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: true,
    multiple: true,
    directory: true,
    webkitdirectory: "true",
  });

  const handleToggle = () => setToggle(!toggle);

  const handleNavigateToEditor = () => {
    navigate('/editing');
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Get notification icon based on type
  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'change-pending':
        return <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />;
      case 'file-updated':
        return <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />;
      case 'approval-success':
        return <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />;
      case 'rejection-info':
        return <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return time.toLocaleDateString();
  };

  return (
    <div className="text-primary bg-dark overflow-hidden h-screen relative">
      {/* Header */}
      <div className="bg-dark flex flex-col h-full">
        <div className="p-4 flex items-center justify-between relative">
          <SearchBar />
          <div className="hidden sm:flex items-center gap-6 text-primary">
            <HomeIcon className="hover:text-secondary cursor-pointer transition" />
            <History className="hover:text-secondary cursor-pointer transition" />
            
            {/* 🔔 Enhanced Bell icon with badge */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative">
                <Bell className="hover:text-secondary cursor-pointer transition" />
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
                {notifications.some(n => n.type === 'change-pending') && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></span>
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

            <User className="hover:text-secondary cursor-pointer transition" />
          </div>
          {/* Mobile menu toggle */}
          <button 
            className="sm:hidden p-2 rounded hover:bg-transparent transition group" 
            onClick={handleToggle}
          >
            {toggle ? (
              <X size={24} className="text-primary group-hover:text-secondary transition" />
            ) : (
              <Menu size={24} className="text-primary group-hover:text-secondary transition" />
            )}
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Drag-and-drop area */}
          <div
            {...getRootProps()}
            className={`w-full max-w-2xl h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer mb-6
              ${isDragActive
                ? 'border-secondary bg-secondary/10'
                : 'border-gray-500 bg-gray-800 hover:border-secondary hover:bg-gray-700'}`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-secondary font-medium">Drop your files/folders here...</p>
            ) : (
              <div className="text-center">
                <p className="text-gray-300 mb-2">
                  Drag & drop your <strong className="text-secondary">files or folders</strong> here, or click to select
                </p>
                <p className="text-sm text-gray-400">
                  Files will be uploaded and you'll be redirected to the editor
                </p>
              </div>
            )}
            {loading && (
              <div className="mt-4 text-center">
                <p className="text-sm text-secondary">Uploading files... {uploadProgress}%</p>
                <div className="w-48 bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-secondary h-2 rounded-full transition-all duration-300" 
                    style={{width: `${uploadProgress}%`}}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Navigate to Editor Button */}
          <button
            onClick={handleNavigateToEditor}
            className="px-6 py-3 bg-secondary text-dark font-medium rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Go to Editor
          </button>

          {/* Pending Changes Summary */}
          {notifications.some(n => n.type === 'change-pending') && (
            <div className="mt-4 p-3 bg-orange-600/20 border border-orange-600/30 rounded-lg">
              <p className="text-sm text-orange-200">
                You have {notifications.filter(n => n.type === 'change-pending').length} pending change{notifications.filter(n => n.type === 'change-pending').length > 1 ? 's' : ''} waiting for approval
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right side menu overlay */}
      {toggle && (
        <>
          <div
            className="sm:hidden fixed inset-0 bg-black bg-opacity-40 z-40"
            onClick={handleToggle}
          />
          <div className="sm:hidden fixed top-0 right-0 h-full w-64 bg-gray-900 shadow-lg z-50 p-4 flex flex-col transition-transform duration-300">
            <button
              className="self-end mb-4 p-2 rounded hover:bg-transparent transition group"
              onClick={handleToggle}
            >
              <X size={24} className="text-primary group-hover:text-secondary transition" />
            </button>
            <MenuBar secondary />
          </div>
        </>
      )}
    </div>
  );
};

export default Home;