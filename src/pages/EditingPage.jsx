import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
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
  ExternalLink
} from "lucide-react";

const FileEditorPage=()=> {
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

  const API_BASE = "https://livesh.onrender.com/api/files";

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
      
      // Add cache busting parameter
      url += (url.includes('?') ? '&' : '?') + 'timestamp=' + Date.now();
      
      console.log('Loading files from:', url);
      const { data } = await axios.get(url);
      console.log('Files response:', data);
      
      setFiles(data.files || []);
      setSelectedFile(null);
      
      // Auto-select first non-folder file if available
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

  // Initialize files - with forced refresh capability
  useEffect(() => {
    const sharedId = params.sharedId;
    console.log('FileEditorPage mounted, sharedId:', sharedId, 'currentFolderId:', currentFolderId);
    
    if (sharedId) {
      loadSharedFiles(sharedId);
    } else {
      loadFiles(currentFolderId);
    }
  }, [params.sharedId, currentFolderId]);

  // Force reload when navigating from other pages (like Home after upload)
  useEffect(() => {
    console.log('Location changed:', location.pathname, location.search);
    // Force reload files when coming from upload or other navigation
    if (!params.sharedId) {
      // Check if this is a refresh from upload
      const urlParams = new URLSearchParams(location.search);
      if (urlParams.get('refresh')) {
        console.log('Detected refresh from upload, forcing reload...');
        // Clear any cached data and reload
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareMenuOpen]);

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

  const handleSave = async () => {
    if (!selectedFile || isSharedView) return;
    try {
      setSaving(true);
      await axios.put(`${API_BASE}/${selectedFile}`, { content: fileContent });
      setFiles(prev => prev.map(f => (f._id || f.id) === selectedFile ? { ...f, content: fileContent } : f));
      alert('File saved successfully!');
    } catch (err) {
      console.error('Failed to save file:', err);
      alert(err.response?.data?.message || err.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  // FIXED SHARE FUNCTIONALITY
  const handleShare = async () => {
    if (isSharedView) {
      alert('Cannot create share links in shared view');
      return;
    }

    try {
      setSharing(true);
      let shareId;
      
      // Determine what to share
      if (currentFolderId) {
        // Share the current folder
        shareId = currentFolderId;
      } else {
        // If at root level, we need to share the root workspace
        // This assumes your backend can handle sharing the entire workspace
        shareId = 'root';
      }
      
      console.log('Creating share link for:', shareId);
      
      // Create share link
      const response = await axios.post(`${API_BASE}/share`, {
        folderId: shareId,
        type: 'folder'
      });
      
      console.log('Share response:', response.data);
      
      if (response.data && response.data.shareLink) {
        const fullShareLink = `${window.location.origin}/editing/shared/${response.data.shareId}`;
        setShareLink(fullShareLink);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(fullShareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        
        alert('Share link created and copied to clipboard!');
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      console.error('Failed to create share link:', err);
      
      // Enhanced error handling
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
        // Fallback for older browsers
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

  const handleRun = () => {
    alert("Run button clicked! (Backend integration needed)");
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

      {/* Sidebar - FIXED WITH PROPER SCROLLING */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 w-80 bg-gray-800 border-r border-gray-700 transition-transform duration-300 ease-in-out flex flex-col h-full`}>
        {/* Sidebar Header - Fixed Height */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">{isSharedView ? 'Shared Files' : 'Explorer'}</h2>
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

        {/* File List - FIXED SCROLLABLE AREA */}
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
                      <div className="text-sm font-medium truncate">{file.name}</div>
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
                {isSharedView && <span className="text-xs bg-yellow-600 px-2 py-1 rounded">Read Only</span>}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No file selected</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isSharedView && selectedFile && (
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1">
          {selectedFileObj && !selectedFileObj.isFolder ? (
            <textarea 
              value={fileContent} 
              onChange={(e) => setFileContent(e.target.value)} 
              readOnly={isSharedView} 
              className="w-full h-full bg-gray-900 text-white p-4 resize-none outline-none border-none font-mono text-sm leading-relaxed" 
              style={{ 
                fontFamily: "'JetBrains Mono', monospace", 
                fontSize: '14px', 
                lineHeight: '1.5', 
                tabSize: 2 
              }} 
              placeholder={isSharedView ? "Read-only view" : "Start typing your code here..."} 
              spellCheck={false} 
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No file selected</h3>
                <p className="text-sm mb-4">Select a file from the sidebar to start editing</p>
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

        {/* Status Bar */}
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
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              loading ? 'bg-yellow-400' : 
              saving ? 'bg-orange-400' : 
              sharing ? 'bg-purple-400' :
              'bg-green-400'
            }`}></span>
            <span>
              {loading ? 'Loading...' : 
               saving ? 'Saving...' : 
               sharing ? 'Creating share link...' :
               'Ready'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileEditorPage;
