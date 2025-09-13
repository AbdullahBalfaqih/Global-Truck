import { cn } from "@/lib/utils";

export const YemenFlag = ({
    className,
    ...props
}: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 900 600"
        className={cn("w-6 h-4", className)}
        {...props}
    >
        {/* أحمر */}
        <rect width="900" height="200" y="0" fill="#ce1126" />
        {/* أبيض */}
        <rect width="900" height="200" y="200" fill="#ffffff" />
        {/* أسود */}
        <rect width="900" height="200" y="400" fill="#000000" />
    </svg>
);
