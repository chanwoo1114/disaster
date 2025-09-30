export const initializeMap = (containerId, options = {}) => {
  const vw = window.vw
  if (!vw || !vw.ol3) return;

  const defaultOptions = {
    basemapType: vw.ol3.BasemapType.GRAPHIC_WHITE,
    controlDensity: vw.ol3.DensityType.EMPTY,
    interactionDensity: vw.ol3.DensityType.BASIC,
    controlsAutoArrange: true,
    homePosition: vw.ol3.CameraPosition,
    initPosition: vw.ol3.CameraPosition
  }

  const mapOptions = { ...defaultOptions, ...options };



}