declare module 'react-stockcharts' {
  export class ChartCanvas extends React.Component<any, any> {}
  export class Chart extends React.Component<any, any> {}
}

declare module 'react-stockcharts/lib/series' {
  export class BarSeries extends React.Component<any, any> {}
  export class CandlestickSeries extends React.Component<any, any> {}
  export class StraightLine extends React.Component<any, any> {}
}

declare module 'react-stockcharts/lib/axes' {
  export class YAxis extends React.Component<any, any> {}
  export class XAxis extends React.Component<any, any> {}
}

declare module 'react-stockcharts/lib/tooltip' {
  export class HoverTooltip extends React.Component<any, any> {}
}

declare module 'react-stockcharts/lib/coordinates' {
  export class CrossHairCursor extends React.Component<any, any> {}
  export class MouseCoordinateY extends React.Component<any, any> {}
  export class EdgeIndicator extends React.Component<any, any> {}
}

declare module 'react-stockcharts/lib/annotation' {
  export class Label extends React.Component<any, any> {}
  export class Annotate extends React.Component<any, any> {}
  export class SvgPathAnnotation extends React.Component<any, any> {}
}

declare module 'react-stockcharts/lib/scale' {
  export const discontinuousTimeScaleProvider = {
    inputDateAccessor = any => any,
  };
}

declare module 'react-stockcharts/lib/helper' {
  export const fitWidth = any => any;
}

declare module 'react-stockcharts/lib/utils' {
  export const last: any;
}

declare module 'react-stockcharts/lib/interactive' {
  export const ClickCallback: any;
}
