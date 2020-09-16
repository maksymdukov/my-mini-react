import { createElement } from './Element';
import { Renderer } from './Renderer';
import { Hooks } from './Hooks';

const render = (vdom, container) => new Renderer(vdom, container);

export const { useState } = Hooks;
export const { useEffect } = Hooks;

export default {
  createElement,
  render,
  useState,
  useEffect,
};
