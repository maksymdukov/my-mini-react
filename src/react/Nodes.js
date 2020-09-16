export class ReactChildrenNode {
  constructor(containerFragment, children) {
    this.containerFragment = containerFragment;
    this.children = children;
  }
}

export class ReactTextNode {
  constructor(value) {
    this.value = value;
  }
}
