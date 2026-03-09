import { useState } from "react";
import { postCreateProject } from "../../../services/api.js";
import { uploadFileInChunks } from "../../../services/chunkUpload.js";

const INITIAL_DISASTER_PARAMS = {
  radius1: "",
  radius2: "",
  radius3: "",
  radius4: "",
  windDirection: 0,
  windSpeed: "",
};

export function useProjectForm({ onSuccess } = {}) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedDisaster, setSelectedDisaster] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [coordinates, setCoordinates] = useState({ x: "", y: "" });
  const [mapCenter, setMapCenter] = useState(null);
  const [disasterParams, setDisasterParams] = useState(INITIAL_DISASTER_PARAMS);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const register = (name) => {
    const values = { projectName, projectDescription };
    return {
      name,
      value: values[name] ?? "",
      onChange: (e) => {
        if (name === "projectName") setProjectName(e.target.value);
        if (name === "projectDescription") setProjectDescription(e.target.value);
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      },
    };
  };

  const validate = () => {
    const newErrors = {};
    if (!projectName.trim()) {
      newErrors.projectName = { message: "프로젝트명을 입력하세요." };
    }
    if (!selectedDisaster) {
      newErrors.disasterType = { message: "재난 유형을 선택하세요." };
    }
    if (!selectedLocation) {
      newErrors.selectedLocation = { message: "위치를 선택하세요." };
    }
    if (!uploadedFile) {
      newErrors.uploadedFile = { message: "파일을 업로드하세요." };
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (onSubmitFn) => (e) => {
    e.preventDefault();
    if (validate()) onSubmitFn();
  };

  const handleSelectDisaster = (key) => {
    setSelectedDisaster(key);
    setSelectedLocation("");
    setCoordinates({ x: "", y: "" });
    setMapCenter(null);
    setDisasterParams(INITIAL_DISASTER_PARAMS);
    setErrors((prev) => ({ ...prev, disasterType: undefined }));
  };

  const handleLocationChange = (loc, locations) => {
    setSelectedLocation(loc);
    if (loc !== "map-select") {
      const found = locations.find((l) => l.name === loc);
      if (found) {
        setCoordinates({ x: found.x, y: found.y });
        setMapCenter({ x: found.x, y: found.y });
      }
    }
    setErrors((prev) => ({ ...prev, selectedLocation: undefined }));
  };

  const handleCoordinatesChange = (field, value) => {
    setCoordinates((prev) => ({ ...prev, [field]: value }));
  };

  const handleMapClick = ({ x, y }) => {
    setCoordinates({ x, y });
    setSelectedLocation("map-select");
  };

  const handleParamChange = (key, value) => {
    setDisasterParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileSelect = (file) => {
    setUploadedFile(file);
    setErrors((prev) => ({ ...prev, uploadedFile: undefined }));
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      const uploadId = await uploadFileInChunks(uploadedFile, setUploadProgress);

      await postCreateProject({
        uploadId,
        projectName,
        projectDescription,
        disasterType: selectedDisaster,
        lng: parseFloat(coordinates.x),
        lat: parseFloat(coordinates.y),
        radius1: parseFloat(disasterParams.radius1),
        radius2: parseFloat(disasterParams.radius2),
        radius3: disasterParams.radius3 ? parseFloat(disasterParams.radius3) : null,
        radius4: disasterParams.radius4 ? parseFloat(disasterParams.radius4) : null,
        windDirection: disasterParams.windDirection ? parseInt(disasterParams.windDirection) : null,
        windSpeed: disasterParams.windSpeed ? parseFloat(disasterParams.windSpeed) : null,
      });

      resetForm();
      if (onSuccess) onSuccess();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setProjectName("");
    setProjectDescription("");
    setSelectedDisaster("");
    setSelectedLocation("");
    setCoordinates({ x: "", y: "" });
    setMapCenter(null);
    setDisasterParams(INITIAL_DISASTER_PARAMS);
    setUploadedFile(null);
    setUploadProgress(0);
    setErrors({});
  };

  return {
    form: { register, handleSubmit, formState: { errors } },
    selectedDisaster,
    selectedLocation,
    coordinates,
    mapCenter,
    disasterParams,
    uploadedFile,
    setUploadedFile,
    uploadProgress,
    isSubmitting,
    handleSelectDisaster,
    handleLocationChange,
    handleCoordinatesChange,
    handleMapClick,
    handleParamChange,
    handleFileSelect,
    onSubmit,
    resetForm,
  };
}
