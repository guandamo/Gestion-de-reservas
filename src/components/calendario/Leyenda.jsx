export default function Leyenda({ color, texto }) {
    return (
        <span className="flex items-center gap-1.5 text-gray-400">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
            {texto}
        </span>
    );
}