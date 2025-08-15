
// ===== HOME COMPONENT (Updated) =====
import { useCallback, useState } from 'react';
import SearchBar from '../components/SearchBar';
import { User, Bell, HomeIcon, History, Menu, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import MenuBar from '../components/MenuBar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toggle, setToggle] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  return (
    <div className="text-primary bg-dark overflow-hidden h-screen relative">
      {/* Header */}
      <div className="bg-dark flex flex-col h-full">
        <div className="p-4 flex items-center justify-between">
          <SearchBar />
          <div className="hidden sm:flex items-center gap-6 text-primary">
            <HomeIcon className="hover:text-secondary cursor-pointer transition" />
            <History className="hover:text-secondary cursor-pointer transition" />
            <Bell className="hover:text-secondary cursor-pointer transition" />
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
