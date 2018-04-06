import { ApplicationRef, ComponentFactoryResolver, Injectable, Injector, NgZone } from '@angular/core';
import { FrameworkDelegate, ViewLifecycle } from '@ionic/core';


@Injectable()
export class AngularDelegate {

  constructor(
    private appRef: ApplicationRef,
    private zone: NgZone
  ) {}

  create(cfr: ComponentFactoryResolver, injector: Injector) {
    return new AngularFrameworkDelegate(cfr, injector, this.appRef, this.zone);
  }
}


export class AngularFrameworkDelegate implements FrameworkDelegate {

  private elRefMap = new WeakMap<HTMLElement, any>();

  constructor(
    private cfr: ComponentFactoryResolver,
    private injector: Injector,
    private appRef: ApplicationRef,
    private zone: NgZone,
  ) {}

  attachViewToDom(container: any, component: any, params?: any, cssClasses?: string[]): Promise<any> {
    return new Promise(resolve => {
      this.zone.run(() => {
        const el = attachView(
          this.cfr, this.injector, this.appRef, this.elRefMap,
          container, component, params, cssClasses
        );
        resolve(el);
      });
    });
  }

  removeViewFromDom(_container: any, component: any): Promise<void> {
    return new Promise(resolve => {
      this.zone.run(() => {
        const componentRef = this.elRefMap.get(component);
        if (componentRef) {
          componentRef.destroy();
          this.elRefMap.delete(component);
        }
        resolve();
      });
    });
  }
}

export function attachView(
  cfr: ComponentFactoryResolver,
  injector: Injector,
  appRef: ApplicationRef,
  elRefMap: WeakMap<HTMLElement, any>,
  container: any, component: any, data?: any, cssClasses?: string[]) {
  const componentFactory = cfr.resolveComponentFactory(component);
  const hostElement = document.createElement(componentFactory.selector);
  if (data) {
    Object.assign(hostElement, data);
  }

  const childInjector = Injector.create([], injector);
  const componentRef = componentFactory.create(childInjector, [], hostElement);
  for (const clazz of cssClasses) {
    hostElement.classList.add(clazz);
  }
  bindLifecycleEvents(componentRef.instance, hostElement);
  container.appendChild(hostElement);

  appRef.attachView(componentRef.hostView);
  elRefMap.set(hostElement, componentRef);
  return hostElement;
}

const LIFECYCLES = [
  ViewLifecycle.WillEnter,
  ViewLifecycle.DidEnter,
  ViewLifecycle.WillLeave,
  ViewLifecycle.DidLeave,
  ViewLifecycle.WillUnload
];

export function bindLifecycleEvents(instance: any, element: HTMLElement) {
  LIFECYCLES.forEach(eventName => {
    element.addEventListener(eventName, (ev: CustomEvent) => {
      if (typeof instance[eventName] === 'function') {
        instance[eventName](ev.detail);
      }
    });
  });
}
