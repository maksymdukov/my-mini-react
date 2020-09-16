import { Renderer } from './Renderer';

export class Hooks {
  constructor(reconciler) {
    this.reconciler = reconciler;
  }

  startFC(currentFC, parentContainer) {
    Hooks.currentFC = {
      element: currentFC,
      parentContainer: parentContainer || currentFC.container,
    };
  }

  finishFC() {
    if (Hooks.currentFC.element?.useState) {
      Hooks.currentFC.element.useState.currentCall = 1;
    }
    if (Hooks.currentFC.element?.useEffect) {
      Hooks.currentFC.element.useEffect.currentCall = 1;
    }
    Hooks.currentFC = null;
  }

  static useState(initState) {
    const { element, parentContainer } = Hooks.currentFC;
    if (!element.useState) {
      element.useState = { currentCall: 1, queueHash: {} };
    }
    const internal = element.useState;
    const { currentCall } = internal;
    if (!internal.queueHash[internal.currentCall]) {
      internal.queueHash[internal.currentCall] = [];
    }

    const queue = internal.queueHash[currentCall];
    if (!queue.length) {
      queue.push(initState);
    }
    const setState = (newState) => {
      if (typeof newState === 'function') {
        const stateArr = internal.queueHash[currentCall];
        setState(newState(stateArr[stateArr.length - 1]));
        return;
      }
      internal.queueHash[currentCall].push(newState);
      new Renderer(
        element,
        parentContainer instanceof DocumentFragment
          ? element.container
          : parentContainer,
        element,
      );
    };

    const output = [queue[queue.length - 1], setState];
    internal.currentCall++;
    return output;
  }

  static useEffect(fn, deps) {
    const { element } = Hooks.currentFC;
    if (!element.useEffect) {
      element.useEffect = {
        currentCall: 1,
        queue: [],
        depsArr: [],
        cleanups: [],
        unmountCleanups: [],
      };
    }
    const internal = element.useEffect;
    const { depsArr } = internal;
    const { currentCall } = internal;
    if (!Hooks.effects) {
      Hooks.effects = [];
    }

    const scheduleEffects = (onUnmount = false) => {
      Hooks.effects.push(() => {
        const cleanup = fn();
        if (typeof cleanup === 'function') {
          if (onUnmount) {
            return internal.unmountCleanups.push(cleanup);
          }
          internal.cleanups.push(cleanup);
        }
      });
    };

    if (!depsArr[currentCall - 1]) {
      depsArr.push(deps);
      if (deps && !deps.length) {
        scheduleEffects(true);
      } else {
        scheduleEffects();
      }
    } else if (
      !depsArr[currentCall - 1].every((dep, idx) => dep === deps[idx])
    ) {
      // compare and decide whether to run hook;
      scheduleEffects();
    }

    internal.currentCall++;
  }
}
