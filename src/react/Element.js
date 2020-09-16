export class ReactElement {
  constructor(type, props, children) {
    this.type = type;
    this.props = props;
    this.children = children;
  }
}

export function createElement(type, props, ...children) {
  return new ReactElement(type, props, children);
}
