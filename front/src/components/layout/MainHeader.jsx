export default function MainHeader({ mainName }) {
  return (
    <div>
      <div>
        <div className="p-4 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{mainName}</h2>
          </div>
        </div>

        <div className="border-b border-gray-200"></div>
      </div>
    </div>
  )
}