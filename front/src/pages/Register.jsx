import { useState, useEffect, useRef } from "react";
import { getProjectData } from "../services/api.js";

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
  const [mainName, setMainName] = useState('새 프로젝트');
  const [viewMode, setViewMode] = useState('empty'); //empty, create, view


  const calculateLimit = () => {
    if (scrollRef.current) {
      const containerHeight = scrollRef.current.clientHeight;
      const itemHeight = 60;
      const visibleItems = Math.ceil(containerHeight / itemHeight);
      const calculatedLimit = visibleItems + 5;
      return calculatedLimit;
    }
    return 12;
  };


  useEffect(() => {
    if (selectedProject) {
      const project = projectData.find(p => p.id === selectedProject);
      if (project) {
        setMainName(project.project_name);
        setViewMode('view')
      }
    } else {
      setMainName('새 프로젝트');
      setViewMode('empty')
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


  const handleCreateProject = () => {
    setSelectedProject(null);
    setMainName('새 프로젝트');
    setViewMode('create')
  }

  return (
    <div className="flex h-screen">
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
        mainName={mainName}
        viewMode={viewMode}
        selectedProject={selectedProject}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
