import { useEffect } from 'react';

export default function Map({ modalOpen }) {
  useEffect(() => {
    const vw = window.vw;
    if (!vw || !vw.ol3) return;
    vw.ol3.MapOptions = {
      basemapType: vw.ol3.BasemapType.GRAPHIC_WHITE,
      controlDensity: vw.ol3.DensityType.EMPTY,
      interactionDensity: vw.ol3.DensityType.BASIC,
      controlsAutoArrange: true,
      homePosition: vw.ol3.CameraPosition,
      initPosition: vw.ol3.CameraPosition
    };
    new vw.ol3.Map('vmap', vw.ol3.MapOptions);
  }, []);

  return (
    <div className="relative w-screen h-screen">
      <div
        id="vmap"
        className={
          'w-full h-full transition ' +
          (modalOpen ? 'blur-sm opacity-70 pointer-events-none' : 'blur-0 opacity-100')
        }
      />
    </div>
  );
}
