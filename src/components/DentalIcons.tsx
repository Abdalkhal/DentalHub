import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

const TOOTH =
  "M12 4.5C9.6 4.5 7.5 6.5 7.5 9.6c0 2.7 0 5.4.6 7.3.5 1.5 1.6 2.3 2.2 2.8.5.4 1 .6 1.7.6s1.2-.2 1.7-.6c.6-.5 1.7-1.3 2.2-2.8.6-1.9.6-4.6.6-7.3 0-3.1-2.1-5.1-4.5-5.1Z";

export function ToothIcon(props: P) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
    </Svg>
  );
}

export function CrownToothIcon(props: P) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M7.4 9.6h9.2" />
      <path d="M8 6.8c.4-1.2 1.4-2 2.6-2h2.8c1.2 0 2.2.8 2.6 2" />
    </Svg>
  );
}

export function RootCanalIcon(props: P) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M12 9.5c0 2.4 0 4.9.5 6.5" />
      <path d="M12 16.5l-1.4 3.6M12 16.5l1.4 3.6" />
    </Svg>
  );
}

export function ImplantIcon(props: P) {
  return (
    <Svg {...props}>
      <path d="M9 5.4c.3-1.2 1.3-2 2.4-2h1.2c1.1 0 2.1.8 2.4 2" />
      <path d="M8.6 5.7h6.8" />
      <path d="M12 5.7v12" />
      <path d="M10 9.3h4M10 12.3h4M10 15.3h4" />
      <path d="M12 17.7l-1.2 2.2M12 17.7l1.2 2.2" />
    </Svg>
  );
}

export function BracesIcon(props: P) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M8 11.5h8" />
      <rect x="9.4" y="10" width="2" height="3" rx="0.5" />
      <rect x="12.6" y="10" width="2" height="3" rx="0.5" />
    </Svg>
  );
}

export function SparkleToothIcon(props: P) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M17.5 5.6l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
    </Svg>
  );
}

export function ExtractionIcon(props: P) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M12 2.5v3" />
      <path d="M9.5 3.4l2.5 2.1 2.5-2.1" />
    </Svg>
  );
}
