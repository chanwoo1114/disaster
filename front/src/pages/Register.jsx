import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getProjectData } from "../services/api.js";
import { PROJECT_LIST_ITEM_HEIGHT } from "../constants/index.js";

import Sidebar from "../components/layout/Sidebar.jsx"
import MainContent from "../components/layout/MainContent.jsx";

export default function Register() {
  const [projectData, setProjectData] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [mode, setMode] = useState('list');

  const limitRef = useRef(limit);
  limitRef.current = limit;

  const selectedProjectData = useMemo(
    () => projectData.find(p => p.id === selectedProjectId) || null,
    [projectData, selectedProjectId]
  );

  const calculateLimit = useCallback(() => {
    if (scrollRef.current) {
      const containerHeight = scrollRef.current.clientHeight;
      const visibleItems = Math.ceil(containerHeight / PROJECT_LIST_ITEM_HEIGHT);
      return visibleItems + 5;
    }
    return 12;
  }, []);

  useEffect(() => {
    const initialLimit = calculateLimit();
    setLimit(initialLimit);

    let timerId;
    const handleResize = () => {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        const newLimit = calculateLimit();
        setLimit(prev => {
          if (newLimit !== prev) {
            return newLimit;
          }
          return prev;
        });
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateLimit]);

  useEffect(() => {
    if (limit > 0) {
      fetchData();
    }
  }, [page]);

  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await getProjectData(page, limit);
      if (response?.success && response?.data?.length > 0) {
        setProjectData(prev => [...prev, ...response.data]);
        if (response.data.length < limit) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const resetAndFetch = async () => {
    setLoading(true);
    setHasMore(true);
    try {
      const response = await getProjectData(1, limitRef.current);
      if (response?.success && response?.data?.length > 0) {
        setProjectData(response.data);
        setPage(1);
        setHasMore(response.data.length >= limitRef.current);
      } else {
        setProjectData([]);
        setHasMore(false);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const element = e.target;
    const bottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    if (bottom && !loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const handleSelectProject = useCallback((projectId) => {
    setSelectedProjectId(projectId);
    setMode(projectId ? 'view' : 'list');
  }, []);

  const handleCreateProject = useCallback(() => {
    setSelectedProjectId(null);
    setMode('create');
  }, []);

  const handleCancelCreate = useCallback(() => {
    setSelectedProjectId(null);
    setMode('list');
  }, []);

  const handleSuccess = useCallback(() => {
    setSelectedProjectId(null);
    setMode('list');
    resetAndFetch();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        projectData={projectData}
        selectedProject={selectedProjectId}
        onSelectProject={handleSelectProject}
        loading={loading}
        hasMore={hasMore}
        scrollRef={scrollRef}
        handleScroll={handleScroll}
        onCreateProject={handleCreateProject}
      />

      <MainContent
        mode={mode}
        selectedProjectData={mode === 'view' ? selectedProjectData : null}
        onCreateProject={handleCreateProject}
        onCancelCreate={handleCancelCreate}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
