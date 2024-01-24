import Control from "ol/control/Control";
import EventType from "ol/events/EventType";
import MapProperty from "ol/MapProperty";
import { CLASS_CONTROL, CLASS_UNSELECTABLE, CLASS_UNSUPPORTED } from "ol/css";
import { EventsKey, listen, unlistenByKey } from "ol/events";
import { replaceNode } from "ol/dom";
import { Options as FullScreenOptions } from "ol/control/FullScreen";
import Map from "ol/Map";

const events = ["fullscreenchange", "webkitfullscreenchange", "MSFullscreenChange"];

const FullScreenEventType = {
  ENTERFULLSCREEN: "enterfullscreen",
  LEAVEFULLSCREEN: "leavefullscreen",
};

type CustomFullScreenOptions = FullScreenOptions & {
  activeTipLabel?: string;
  inactiveTipLabel?: string;
};

class FullScreenControl extends Control {
  private keys_: boolean;
  private source_: HTMLElement | string | undefined;
  private isInFullscreen_: boolean;
  private boundHandleMapTargetChange_: any;
  private cssClassName_: string;
  private documentListeners_: EventsKey[];
  private activeClassName_: string[];
  private inactiveClassName_: string[];
  private labelNode_: Text | HTMLElement;
  private labelActiveNode_: Text | HTMLElement;
  private button_: HTMLElement;
  private activeTipLabel_: string;
  private inactiveTipLabel_: string;

  constructor(options: CustomFullScreenOptions) {
    options = options || {};
    super({
      element: document.createElement("div"),
      target: options.target,
    });

    this.keys_ = options.keys ?? false;
    this.source_ = options.source;
    this.isInFullscreen_ = false;
    this.boundHandleMapTargetChange_ = this.handleMapTargetChange_.bind(this);
    this.cssClassName_ = options.className ?? "ol-full-screen";
    this.documentListeners_ = [];
    this.activeClassName_ = options.activeClassName !== undefined ? options.activeClassName.split(" ") : [this.cssClassName_ + "-true"];
    this.inactiveClassName_ =
      options.inactiveClassName !== undefined ? options.inactiveClassName.split(" ") : [this.cssClassName_ + "-false"];

    const label = options.label ?? "\u2922";

    this.labelNode_ = typeof label === "string" ? document.createTextNode(label) : label;

    const labelActive = options.labelActive ?? "\u00d7";

    this.labelActiveNode_ = typeof labelActive === "string" ? document.createTextNode(labelActive) : labelActive;

    const tipLabel = options.tipLabel ? options.tipLabel : "Toggle full-screen";
    this.activeTipLabel_ = options.activeTipLabel ? options.activeTipLabel : tipLabel;
    this.inactiveTipLabel_ = options.inactiveTipLabel ? options.inactiveTipLabel : tipLabel;

    this.button_ = document.createElement("button");
    this.button_.title = this.inactiveTipLabel_;
    this.button_.setAttribute("type", "button");
    this.button_.appendChild(this.labelNode_);
    this.button_.addEventListener(EventType.CLICK, this.handleClick_.bind(this), false);
    this.setClassName_(this.button_, this.isInFullscreen_);

    this.element.className = `${this.cssClassName_} ${CLASS_UNSELECTABLE} ${CLASS_CONTROL}`;
    this.element.appendChild(this.button_);
  }

  private handleClick_(event: Event) {
    event.preventDefault();
    this.handleFullScreen_();
  }

  private handleFullScreen_() {
    const map = this.getMap();
    if (!map) {
      return;
    }
    const doc = map.getOwnerDocument();
    if (!isFullScreenSupported(doc)) {
      return;
    }
    if (isFullScreen(doc)) {
      exitFullScreen(doc);
    } else {
      let element;
      if (this.source_) {
        element = typeof this.source_ === "string" ? doc.getElementById(this.source_) : this.source_;
      } else {
        element = map.getTargetElement();
      }
      if (!element) {
        return;
      }
      if (this.keys_) {
        requestFullScreenWithKeys(element);
      } else {
        requestFullScreen(element);
      }
    }
  }

  private handleFullScreenChange_() {
    const map = this.getMap();
    if (!map) {
      return;
    }
    const wasInFullscreen = this.isInFullscreen_;
    this.isInFullscreen_ = isFullScreen(map.getOwnerDocument());
    if (wasInFullscreen !== this.isInFullscreen_) {
      this.setClassName_(this.button_, this.isInFullscreen_);
      this.setTitle_(this.button_, this.isInFullscreen_);
      if (this.isInFullscreen_) {
        replaceNode(this.labelActiveNode_, this.labelNode_);
        this.dispatchEvent(FullScreenEventType.ENTERFULLSCREEN);
      } else {
        replaceNode(this.labelNode_, this.labelActiveNode_);
        this.dispatchEvent(FullScreenEventType.LEAVEFULLSCREEN);
      }
      map.updateSize();
    }
  }

  private setClassName_(element: HTMLElement, fullscreen: boolean) {
    if (fullscreen) {
      element.classList.remove(...this.inactiveClassName_);
      element.classList.add(...this.activeClassName_);
    } else {
      element.classList.remove(...this.activeClassName_);
      element.classList.add(...this.inactiveClassName_);
    }
  }

  private setTitle_(element: HTMLElement, fullscreen: boolean) {
    if (fullscreen) {
      element.title = this.activeTipLabel_;
    } else {
      element.title = this.inactiveTipLabel_;
    }
  }

  setMap(map: Map) {
    const oldMap = this.getMap();
    if (oldMap) {
      oldMap.removeChangeListener(MapProperty.TARGET, this.boundHandleMapTargetChange_);
    }

    super.setMap(map);

    this.handleMapTargetChange_();
    if (map) {
      map.addChangeListener(MapProperty.TARGET, this.boundHandleMapTargetChange_);
    }
  }

  private handleMapTargetChange_() {
    const listeners = this.documentListeners_;
    for (let i = 0, ii = listeners.length; i < ii; ++i) {
      unlistenByKey(listeners[i]);
    }
    listeners.length = 0;

    const map = this.getMap();
    if (map) {
      const doc = map.getOwnerDocument();
      if (isFullScreenSupported(doc)) {
        this.element.classList.remove(CLASS_UNSUPPORTED);
      } else {
        this.element.classList.add(CLASS_UNSUPPORTED);
      }

      for (let i = 0, ii = events.length; i < ii; ++i) {
        listeners.push(listen(doc, events[i], this.handleFullScreenChange_, this));
      }
      this.handleFullScreenChange_();
    }
  }
}

function isFullScreenSupported(doc: Document) {
  const body = doc.body;
  return !!((body as any)["webkitRequestFullscreen"] || ((body as any).requestFullscreen && doc.fullscreenEnabled));
}

function isFullScreen(doc: Document) {
  return !!((doc as any)["webkitIsFullScreen"] || doc.fullscreenElement);
}

function requestFullScreen(element: HTMLElement) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if ((element as any)["webkitRequestFullscreen"]) {
    (element as any)["webkitRequestFullscreen"]();
  }
}

function requestFullScreenWithKeys(element: HTMLElement) {
  if ((element as any)["webkitRequestFullscreen"]) {
    (element as any)["webkitRequestFullscreen"]();
  } else {
    requestFullScreen(element);
  }
}

function exitFullScreen(doc: Document) {
  if (doc.exitFullscreen) {
    doc.exitFullscreen();
  } else if ((doc as any)["webkitExitFullscreen"]) {
    (doc as any)["webkitExitFullscreen"]();
  }
}

export default FullScreenControl;
