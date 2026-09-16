import Svg, { Path, Rect, type SvgProps } from 'react-native-svg';

type P = SvgProps & { size?: number };

function Icon({ size = 20, color = 'currentColor', children, ...props }: P & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </Svg>
  );
}

const TOOTH =
  'M12 4.5C9.6 4.5 7.5 6.5 7.5 9.6c0 2.7 0 5.4.6 7.3.5 1.5 1.6 2.3 2.2 2.8.5.4 1 .6 1.7.6s1.2-.2 1.7-.6c.6-.5 1.7-1.3 2.2-2.8.6-1.9.6-4.6.6-7.3 0-3.1-2.1-5.1-4.5-5.1Z';

export function ToothIcon(props: P) {
  return (
    <Icon {...props}>
      <Path d={TOOTH} />
    </Icon>
  );
}

export function CrownToothIcon(props: P) {
  return (
    <Icon {...props}>
      <Path d={TOOTH} />
      <Path d="M7.4 9.6h9.2" />
      <Path d="M8 6.8c.4-1.2 1.4-2 2.6-2h2.8c1.2 0 2.2.8 2.6 2" />
    </Icon>
  );
}

export function RootCanalIcon(props: P) {
  return (
    <Icon {...props}>
      <Path d={TOOTH} />
      <Path d="M12 9.5c0 2.4 0 4.9.5 6.5" />
      <Path d="M12 16.5l-1.4 3.6M12 16.5l1.4 3.6" />
    </Icon>
  );
}

export function ImplantIcon(props: P) {
  return (
    <Icon {...props}>
      <Path d="M9 5.4c.3-1.2 1.3-2 2.4-2h1.2c1.1 0 2.1.8 2.4 2" />
      <Path d="M8.6 5.7h6.8" />
      <Path d="M12 5.7v12" />
      <Path d="M10 9.3h4M10 12.3h4M10 15.3h4" />
      <Path d="M12 17.7l-1.2 2.2M12 17.7l1.2 2.2" />
    </Icon>
  );
}

export function BracesIcon(props: P) {
  return (
    <Icon {...props}>
      <Path d={TOOTH} />
      <Path d="M8 11.5h8" />
      <Rect x={9.4} y={10} width={2} height={3} rx={0.5} />
      <Rect x={12.6} y={10} width={2} height={3} rx={0.5} />
    </Icon>
  );
}

export function SparkleToothIcon(props: P) {
  return (
    <Icon {...props}>
      <Path d={TOOTH} />
      <Path d="M17.5 5.6l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
    </Icon>
  );
}

export function ExtractionIcon(props: P) {
  return (
    <Icon {...props}>
      <Path d={TOOTH} />
      <Path d="M12 2.5v3" />
      <Path d="M9.5 3.4l2.5 2.1 2.5-2.1" />
    </Icon>
  );
}

export type DentalIconComponent = typeof ToothIcon;
