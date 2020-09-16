import { Reconciler } from './Reconciler';

export class Renderer {
  constructor(element, container, oldElement) {
    this.rootContainer = container;
    this.element = element;
    this.oldElement = oldElement;
    this.reconciler = new Reconciler(this, element);
    this.render();
  }

  render() {
    this.reconciler.startReconcile(
      this.element,
      this.rootContainer,
      this.oldElement,
    );
  }

  createElement(tag) {
    return document.createElement(tag);
  }

  addElementListener(container, eventName, listener) {
    const normalizedEventName = eventName.toLowerCase().substr(2);
    container.addEventListener(normalizedEventName, listener);
  }

  removeElementListener(container, eventName, listener) {
    const normalizedEventName = eventName.toLowerCase().substr(2);
    container.removeEventListener(normalizedEventName, listener);
  }

  setElementClassName(container, className) {
    container.setAttribute('class', className);
  }

  setElementAttribute(container, attrName, attrValue) {
    container.setAttribute(attrName, attrValue);
  }

  removeElementAttriibute(container, attrName) {
    container.removeAttribure(attrName);
  }

  createTextNode(text) {
    return document.createTextNode(text);
  }

  createFragment() {
    return document.createDocumentFragment();
  }

  appendNode(parent, child) {
    parent.appendChild(child);
  }

  insertBefore(parent, nextSibling, newContainer) {
    parent.insertBefore(newContainer, nextSibling);
  }

  insertAfter(parent, prevSibling, newContainer) {
    prevSibling.after(newContainer);
  }

  removeNode(element, parent) {
    parent.removeChild(element);
  }

  setValue(container, name, value) {
    container[name] = value;
  }
}
