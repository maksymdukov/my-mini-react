import { ReactChildrenNode, ReactTextNode } from './Nodes';
import { Hooks } from './Hooks';

export class Reconciler {
  constructor(renderer) {
    this.renderer = renderer;
    this.hooks = new Hooks(this);
  }

  startReconcile(element, container, oldElement) {
    this.reconcile(element, container, oldElement);
    this.runHooks();
  }

  runHooks() {
    if (Hooks.effects && Hooks.effects.length) {
      setTimeout(() => {
        while (Hooks.effects.length) {
          const effect = Hooks.effects.pop();
          effect();
        }
      });
    }
  }

  reconcile(element, container, oldElement) {
    // there's no old vdom yet
    if (typeof oldElement === 'undefined') {
      return this.mountElement(element, container);
    }

    if (element.type !== oldElement.type) {
      const newElement = this.mountElement(element, container, oldElement);
      this.unmountElement(oldElement, container);
      // mount new <FC2> in place of <FC>
      return newElement;
    }

    // same FC
    if (typeof element.type === 'function') {
      return this.updateFCElement(container, element, oldElement);
    }

    // same HTML tag
    if (typeof element.type === 'string') {
      const newElement = this.updateSimpleElement(
        oldElement._nativeContainer,
        element,
        oldElement,
      );
      oldElement.children = newElement.children;
      oldElement.props = newElement.props;
      return oldElement;
    }

    if (element instanceof ReactChildrenNode) {
      if (element === oldElement) return oldElement;
      return oldElement;
    }

    if (element instanceof ReactTextNode) {
      if (element.value !== oldElement.value) {
        const newTextElement = this.mountElement(
          element,
          container,
          oldElement,
        );
        this.unmountElement(oldElement, container);
        return newTextElement;
      }
      return oldElement;
    }

    if (Array.isArray(element)) {
      const oldKeysObj = oldElement.reduce((acc, elem) => {
        acc[elem.props.key] = elem;
        return acc;
      }, {});

      const tempElems = [];

      const newElems = element.map((elem, idx) => {
        // reshuffle them
        if (oldKeysObj[elem.props.key]) {
          // reshuffle
          const isSamePosition = oldElement[idx].props.key === elem.props.key;
          if (!isSamePosition) {
            if (idx === 0) {
              this.renderer.insertBefore(
                container,
                this.findUnderlyingNativeContainer(oldElement[idx]),
                this.findUnderlyingNativeContainer(oldKeysObj[elem.props.key]),
              );
            } else {
              this.renderer.insertAfter(
                container,
                this.findUnderlyingNativeContainer(tempElems[idx - 1]),
                this.findUnderlyingNativeContainer(oldKeysObj[elem.props.key]),
              );
            }
          }
          const parsedElem = this.reconcile(
            elem,
            container,
            oldKeysObj[elem.props.key],
          );
          tempElems.push(parsedElem);
          delete oldKeysObj[elem.props.key];
          return parsedElem;
        } else {
          // new element - mount
          const newElem = this.mountElement(elem, container, null);
          tempElems.push(newElem);
          return newElem;
        }
      });

      Object.values(oldKeysObj).forEach((oldElem) => {
        this.unmountElement(oldElem, container);
      });

      return newElems;
    }
  }

  unmountElement(element, container) {
    let nativeContainer = element?._nativeContainer;
    if (element && typeof element.type === 'function') {
      // start looking for native element to remove
      nativeContainer = this.findUnderlyingNativeContainer(element);
    }
    if (nativeContainer) {
      this.renderer.removeNode(nativeContainer, container);
    }
    // run cleanup hooks;
    if (element.useEffect?.unmountCleanups?.length) {
      Hooks.effects?.concat(element.useEffect.unmountCleanups);
    }
  }

  findUnderlyingNativeContainer(element) {
    if (element._nativeContainer) {
      return element._nativeContainer;
    }
    if (!element.returns) {
      return null;
    }
    return this.findUnderlyingNativeContainer(element.returns);
  }

  mountElement(element, container, oldElement) {
    // <div>null</div> or false
    if (element === null || element === false) {
      return null;
    }

    // <div>123</div> or <div>abc</div>
    if (
      typeof element === 'string' ||
      typeof element === 'number' ||
      element instanceof ReactTextNode
    ) {
      return this.mountTextNode(element, container, oldElement);
    }

    // <div>...</div>
    if (typeof element.type === 'string') {
      return this.mountSimpleElement(element, container, oldElement);
    }

    // if function element <Foo></Foo>
    if (typeof element.type === 'function') {
      return this.mountFunctionComponent(element, container);
    }

    // {children}
    if (element instanceof ReactChildrenNode) {
      // link passed children to final dom container;
      element.children = element.children.forEach((child) => {
        child.container = container;
      });
      this.renderer.appendNode(container, element.containerFragment);
      return element;
    }

    if (Array.isArray(element)) {
      return element.map((elem) =>
        this.mountElement(elem, container, oldElement),
      );
    }

    return null;
  }

  mountFunctionComponent(element, container) {
    // process Function element's children
    const containerFragment = this.renderer.createFragment();
    element.fcChildren = element.children.map((childElement) =>
      this.mountElement(childElement, containerFragment),
    );
    const childrenNode = new ReactChildrenNode(
      containerFragment,
      element.fcChildren,
    );
    element.container = container;

    // Start processing hooks
    this.hooks.startFC(element);
    const returnsElement = element.type({
      children: childrenNode,
      ...element.props,
    });
    this.hooks.finishFC();
    // Finish hooks
    element.childrenNode = childrenNode;
    element.returns = this.tryConvertTextToTextNode(returnsElement);

    this.mountElement(element.returns, container);

    return element;
  }

  mountTextNode(text, container, oldElement = {}) {
    let element;
    let textNode;
    if (text instanceof ReactTextNode) {
      element = text;
      textNode = this.renderer.createTextNode(element.value);
    } else {
      textNode = this.renderer.createTextNode(text);
      element = new ReactTextNode(text);
    }
    element._nativeContainer = textNode;
    textNode._reactElement = element;
    this.commitNode(container, textNode, oldElement);
    return element;
  }

  commitNode(container, newContainer, oldElement) {
    const nextSibling = this.findUnderlyingNativeContainer(oldElement)
      ?.nextSibling;
    if (nextSibling) {
      this.renderer.insertBefore(container, nextSibling, newContainer);
    } else {
      this.renderer.appendNode(container, newContainer);
    }
  }

  mountSimpleElement(element, container, oldElement = {}) {
    const newContainer = this.renderer.createElement(element.type);
    this.updateSimpleElement(newContainer, element);
    // save internal react element into native container
    newContainer._reactElement = element;
    element._nativeContainer = newContainer;

    this.commitNode(container, newContainer, oldElement);

    element.children = element.children.map((childElement) =>
      this.mountElement(childElement, newContainer),
    );
    return element;
  }

  updateSimpleElement(container, element, oldElement) {
    const newProps = element.props || {};
    const oldProps = oldElement?.props || {};
    this.setNativeElementAttrs(container, newProps, oldProps);

    if (oldElement) {
      element.children = element.children.map((childElement, idx) => {
        if (
          typeof childElement === 'string' ||
          typeof childElement === 'number'
        ) {
          childElement = new ReactTextNode(childElement);
        }
        return this.reconcile(
          childElement,
          container,
          oldElement.children[idx],
        );
      });
    }

    return element;
  }

  updateFCElement(container, element, oldElement = {}) {
    this.hooks.startFC(oldElement, container);
    const newReturnsElement = element.type({
      children: oldElement.childrenNode,
      ...element.props,
    });
    this.hooks.finishFC();

    // compare two returns
    const returns = this.reconcile(
      this.tryConvertTextToTextNode(newReturnsElement),
      container,
      oldElement.returns,
    );
    oldElement.returns = returns;
    return oldElement;
  }

  setNativeElementAttrs(container, newProps, oldProps) {
    // figure out new props
    Object.keys(newProps).forEach((propName) => {
      const newProp = newProps[propName];
      const oldProp = oldProps[propName];
      if (newProps[propName] !== oldProps[propName]) {
        // onClick case
        if (propName.startsWith('on')) {
          if (newProp) {
            if (oldProp) {
              this.renderer.removeElementListener(container, propName, oldProp);
            }
            this.renderer.addElementListener(container, propName, newProp);
          } else {
            this.renderer.removeElementListener(container, propName, oldProp);
          }
          return;
        }

        // className case
        if (propName === 'className') {
          this.renderer.setElementClassName(container, newProp);
          return;
        }

        if (propName === 'value' || propName === 'checked') {
          this.renderer.setValue(container, propName, newProp);
          return;
        }

        if (newProp) {
          this.renderer.setElementAttribute(container, propName, newProp);
        } else {
          this.renderer.removeElementAttriibute(container, propName);
        }
      }
    });
  }

  tryConvertTextToTextNode(val) {
    if (typeof val === 'string' || typeof val === 'number') {
      return new ReactTextNode(val);
    }
    return val;
  }
}
