//#region node_modules/swiper/shared/ssr-window.esm.mjs
/**
* SSR Window 4.0.2
* Better handling for window object in SSR environment
* https://github.com/nolimits4web/ssr-window
*
* Copyright 2021, Vladimir Kharlampidi
*
* Licensed under MIT
*
* Released on: December 13, 2021
*/
function isObject$1(obj) {
	return obj !== null && typeof obj === "object" && "constructor" in obj && obj.constructor === Object;
}
function extend$1(target, src) {
	if (target === void 0) target = {};
	if (src === void 0) src = {};
	Object.keys(src).forEach((key) => {
		if (typeof target[key] === "undefined") target[key] = src[key];
		else if (isObject$1(src[key]) && isObject$1(target[key]) && Object.keys(src[key]).length > 0) extend$1(target[key], src[key]);
	});
}
var ssrDocument = {
	body: {},
	addEventListener() {},
	removeEventListener() {},
	activeElement: {
		blur() {},
		nodeName: ""
	},
	querySelector() {
		return null;
	},
	querySelectorAll() {
		return [];
	},
	getElementById() {
		return null;
	},
	createEvent() {
		return { initEvent() {} };
	},
	createElement() {
		return {
			children: [],
			childNodes: [],
			style: {},
			setAttribute() {},
			getElementsByTagName() {
				return [];
			}
		};
	},
	createElementNS() {
		return {};
	},
	importNode() {
		return null;
	},
	location: {
		hash: "",
		host: "",
		hostname: "",
		href: "",
		origin: "",
		pathname: "",
		protocol: "",
		search: ""
	}
};
function getDocument() {
	const doc = typeof document !== "undefined" ? document : {};
	extend$1(doc, ssrDocument);
	return doc;
}
var ssrWindow = {
	document: ssrDocument,
	navigator: { userAgent: "" },
	location: {
		hash: "",
		host: "",
		hostname: "",
		href: "",
		origin: "",
		pathname: "",
		protocol: "",
		search: ""
	},
	history: {
		replaceState() {},
		pushState() {},
		go() {},
		back() {}
	},
	CustomEvent: function CustomEvent() {
		return this;
	},
	addEventListener() {},
	removeEventListener() {},
	getComputedStyle() {
		return { getPropertyValue() {
			return "";
		} };
	},
	Image() {},
	Date() {},
	screen: {},
	setTimeout() {},
	clearTimeout() {},
	matchMedia() {
		return {};
	},
	requestAnimationFrame(callback) {
		if (typeof setTimeout === "undefined") {
			callback();
			return null;
		}
		return setTimeout(callback, 0);
	},
	cancelAnimationFrame(id) {
		if (typeof setTimeout === "undefined") return;
		clearTimeout(id);
	}
};
function getWindow() {
	const win = typeof window !== "undefined" ? window : {};
	extend$1(win, ssrWindow);
	return win;
}

//#endregion
//#region node_modules/swiper/shared/utils.mjs
function deleteProps(obj) {
	const object = obj;
	Object.keys(object).forEach((key) => {
		try {
			object[key] = null;
		} catch (e) {}
		try {
			delete object[key];
		} catch (e) {}
	});
}
function nextTick(callback, delay) {
	if (delay === void 0) delay = 0;
	return setTimeout(callback, delay);
}
function now() {
	return Date.now();
}
function getComputedStyle(el) {
	const window$1 = getWindow();
	let style;
	if (window$1.getComputedStyle) style = window$1.getComputedStyle(el, null);
	if (!style && el.currentStyle) style = el.currentStyle;
	if (!style) style = el.style;
	return style;
}
function getTranslate(el, axis) {
	if (axis === void 0) axis = "x";
	const window$1 = getWindow();
	let matrix;
	let curTransform;
	let transformMatrix;
	const curStyle = getComputedStyle(el);
	if (window$1.WebKitCSSMatrix) {
		curTransform = curStyle.transform || curStyle.webkitTransform;
		if (curTransform.split(",").length > 6) curTransform = curTransform.split(", ").map((a) => a.replace(",", ".")).join(", ");
		transformMatrix = new window$1.WebKitCSSMatrix(curTransform === "none" ? "" : curTransform);
	} else {
		transformMatrix = curStyle.MozTransform || curStyle.OTransform || curStyle.MsTransform || curStyle.msTransform || curStyle.transform || curStyle.getPropertyValue("transform").replace("translate(", "matrix(1, 0, 0, 1,");
		matrix = transformMatrix.toString().split(",");
	}
	if (axis === "x") if (window$1.WebKitCSSMatrix) curTransform = transformMatrix.m41;
	else if (matrix.length === 16) curTransform = parseFloat(matrix[12]);
	else curTransform = parseFloat(matrix[4]);
	if (axis === "y") if (window$1.WebKitCSSMatrix) curTransform = transformMatrix.m42;
	else if (matrix.length === 16) curTransform = parseFloat(matrix[13]);
	else curTransform = parseFloat(matrix[5]);
	return curTransform || 0;
}
function isObject(o) {
	return typeof o === "object" && o !== null && o.constructor && Object.prototype.toString.call(o).slice(8, -1) === "Object";
}
function isNode(node) {
	if (typeof window !== "undefined" && typeof window.HTMLElement !== "undefined") return node instanceof HTMLElement;
	return node && (node.nodeType === 1 || node.nodeType === 11);
}
function extend() {
	const to = Object(arguments.length <= 0 ? void 0 : arguments[0]);
	const noExtend = [
		"__proto__",
		"constructor",
		"prototype"
	];
	for (let i = 1; i < arguments.length; i += 1) {
		const nextSource = i < 0 || arguments.length <= i ? void 0 : arguments[i];
		if (nextSource !== void 0 && nextSource !== null && !isNode(nextSource)) {
			const keysArray = Object.keys(Object(nextSource)).filter((key) => noExtend.indexOf(key) < 0);
			for (let nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex += 1) {
				const nextKey = keysArray[nextIndex];
				const desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
				if (desc !== void 0 && desc.enumerable) if (isObject(to[nextKey]) && isObject(nextSource[nextKey])) if (nextSource[nextKey].__swiper__) to[nextKey] = nextSource[nextKey];
				else extend(to[nextKey], nextSource[nextKey]);
				else if (!isObject(to[nextKey]) && isObject(nextSource[nextKey])) {
					to[nextKey] = {};
					if (nextSource[nextKey].__swiper__) to[nextKey] = nextSource[nextKey];
					else extend(to[nextKey], nextSource[nextKey]);
				} else to[nextKey] = nextSource[nextKey];
			}
		}
	}
	return to;
}
function setCSSProperty(el, varName, varValue) {
	el.style.setProperty(varName, varValue);
}
function animateCSSModeScroll(_ref) {
	let { swiper, targetPosition, side } = _ref;
	const window$1 = getWindow();
	const startPosition = -swiper.translate;
	let startTime = null;
	let time;
	const duration = swiper.params.speed;
	swiper.wrapperEl.style.scrollSnapType = "none";
	window$1.cancelAnimationFrame(swiper.cssModeFrameID);
	const dir = targetPosition > startPosition ? "next" : "prev";
	const isOutOfBound = (current, target) => {
		return dir === "next" && current >= target || dir === "prev" && current <= target;
	};
	const animate = () => {
		time = (/* @__PURE__ */ new Date()).getTime();
		if (startTime === null) startTime = time;
		const progress = Math.max(Math.min((time - startTime) / duration, 1), 0);
		const easeProgress = .5 - Math.cos(progress * Math.PI) / 2;
		let currentPosition = startPosition + easeProgress * (targetPosition - startPosition);
		if (isOutOfBound(currentPosition, targetPosition)) currentPosition = targetPosition;
		swiper.wrapperEl.scrollTo({ [side]: currentPosition });
		if (isOutOfBound(currentPosition, targetPosition)) {
			swiper.wrapperEl.style.overflow = "hidden";
			swiper.wrapperEl.style.scrollSnapType = "";
			setTimeout(() => {
				swiper.wrapperEl.style.overflow = "";
				swiper.wrapperEl.scrollTo({ [side]: currentPosition });
			});
			window$1.cancelAnimationFrame(swiper.cssModeFrameID);
			return;
		}
		swiper.cssModeFrameID = window$1.requestAnimationFrame(animate);
	};
	animate();
}
function getSlideTransformEl(slideEl) {
	return slideEl.querySelector(".swiper-slide-transform") || slideEl.shadowRoot && slideEl.shadowRoot.querySelector(".swiper-slide-transform") || slideEl;
}
function elementChildren(element, selector) {
	if (selector === void 0) selector = "";
	return [...element.children].filter((el) => el.matches(selector));
}
function createElement(tag, classes) {
	if (classes === void 0) classes = [];
	const el = document.createElement(tag);
	el.classList.add(...Array.isArray(classes) ? classes : [classes]);
	return el;
}
function elementOffset(el) {
	const window$1 = getWindow();
	const document$1 = getDocument();
	const box = el.getBoundingClientRect();
	const body = document$1.body;
	const clientTop = el.clientTop || body.clientTop || 0;
	const clientLeft = el.clientLeft || body.clientLeft || 0;
	const scrollTop = el === window$1 ? window$1.scrollY : el.scrollTop;
	const scrollLeft = el === window$1 ? window$1.scrollX : el.scrollLeft;
	return {
		top: box.top + scrollTop - clientTop,
		left: box.left + scrollLeft - clientLeft
	};
}
function elementPrevAll(el, selector) {
	const prevEls = [];
	while (el.previousElementSibling) {
		const prev = el.previousElementSibling;
		if (selector) {
			if (prev.matches(selector)) prevEls.push(prev);
		} else prevEls.push(prev);
		el = prev;
	}
	return prevEls;
}
function elementNextAll(el, selector) {
	const nextEls = [];
	while (el.nextElementSibling) {
		const next = el.nextElementSibling;
		if (selector) {
			if (next.matches(selector)) nextEls.push(next);
		} else nextEls.push(next);
		el = next;
	}
	return nextEls;
}
function elementStyle(el, prop) {
	return getWindow().getComputedStyle(el, null).getPropertyValue(prop);
}
function elementIndex(el) {
	let child = el;
	let i;
	if (child) {
		i = 0;
		while ((child = child.previousSibling) !== null) if (child.nodeType === 1) i += 1;
		return i;
	}
}
function elementParents(el, selector) {
	const parents = [];
	let parent = el.parentElement;
	while (parent) {
		if (selector) {
			if (parent.matches(selector)) parents.push(parent);
		} else parents.push(parent);
		parent = parent.parentElement;
	}
	return parents;
}
function elementTransitionEnd(el, callback) {
	function fireCallBack(e) {
		if (e.target !== el) return;
		callback.call(el, e);
		el.removeEventListener("transitionend", fireCallBack);
	}
	if (callback) el.addEventListener("transitionend", fireCallBack);
}
function elementOuterSize(el, size, includeMargins) {
	const window$1 = getWindow();
	if (includeMargins) return el[size === "width" ? "offsetWidth" : "offsetHeight"] + parseFloat(window$1.getComputedStyle(el, null).getPropertyValue(size === "width" ? "margin-right" : "margin-top")) + parseFloat(window$1.getComputedStyle(el, null).getPropertyValue(size === "width" ? "margin-left" : "margin-bottom"));
	return el.offsetWidth;
}

//#endregion
export { animateCSSModeScroll, createElement, deleteProps, elementChildren, elementIndex, elementNextAll, elementOffset, elementOuterSize, elementParents, elementPrevAll, elementStyle, elementTransitionEnd, extend, getDocument, getSlideTransformEl, getTranslate, getWindow, isObject, nextTick, now, setCSSProperty };
//# sourceMappingURL=utils-DfHcR85v.js.map