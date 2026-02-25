import { useState, useEffect, useRef } from "react";
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
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const calculateLimit = () => {
    if (scrollRef.current) {
      const containerHeight = scrollRef.current.clientHeight;
      const itemHeight = PROJECT_LIST_ITEM_HEIGHT;
      const visibleItems = Math.ceil(containerHeight / itemHeight);
      return visibleItems + 5;
    }
    return 12;
  };

  useEffect(() => {
    if (selectedProject) {
      const project = projectData.find(p => p.id === selectedProject);
      if (project) {
        setViewMode(true)
      }
    } else {
      setViewMode(false)
    }
  }, [selectedProject, projectData]);

  useEffect(() => {
    const initialLimit = calculateLimit();
    setLimit(initialLimit);

    const handleResize = () => {
      const newLimit = calculateLimit();
      if (newLimit !== limit) {
        setLimit(newLimit);
        if (newLimit > limit && projectData.length < newLimit && hasMore) {
          setPage(prev => prev + 1);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [limit, projectData.length, hasMore]);

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
      console.error('데이터 로딩 실패', error);
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

  // 새 프로젝트 생성
  const handleCreateProject = () => {
    setSelectedProject(null);
    setViewMode(true)
  }

  // 프로젝트 생성 취소
  const handleCancelCreate = () => {
    setSelectedProject(null);
    setViewMode(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 왼쪽 사이드바 영역 */}
      <Sidebar
        projectData={projectData}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        loading={loading}
        hasMore={hasMore}
        scrollRef={scrollRef}
        handleScroll={handleScroll}
        onCreateProject={handleCreateProject}
      />

      {/* 오른쪽 메인 영역 */}
      <MainContent
        viewMode={viewMode}
        selectedProjectData={projectData.find(p => p.id === selectedProject) || null}
        onCreateProject={handleCreateProject}
        onCancelCreate={handleCancelCreate}
        on
      />
    </div>
  );
}
