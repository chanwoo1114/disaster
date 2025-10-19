// 기본 맵 세팅
export const initializeMap = (containerId, mapType = 'GRAPHIC_WHITE') => {
  const vw = window.vw;
  if (!vw || !vw.ol3) return null;

  const types = {
    GRAPHIC_WHITE: vw.ol3.BasemapType.GRAPHIC_WHITE,
    GRAPHIC: vw.ol3.BasemapType.GRAPHIC,
    SATELLITE: vw.ol3.BasemapType.SATELLITE,
    HYBRID: vw.ol3.BasemapType.HYBRID,
    GRAY: vw.ol3.BasemapType.GRAY,
  };
  const resolved =
    typeof mapType === 'string' ? (types[mapType] || types.GRAPHIC_WHITE) : mapType;

  const options = {
    basemapType: resolved,
    controlDensity: vw.ol3.DensityType.EMPTY,
    interactionDensity: vw.ol3.DensityType.BASIC,
    controlsAutoArrange: true,
    homePosition: vw.ol3.CameraPosition,
    initPosition: vw.ol3.CameraPosition,
  };

  return new vw.ol3.Map(containerId, options);
};