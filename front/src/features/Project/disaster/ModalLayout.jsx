export default function ModalLayout({children, onClose}) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded bg-white px-4 py-2 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
