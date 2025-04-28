interface Workbox {
	addEventListener: (event: string, callback: () => void) => void;
	removeEventListener: (event: string, callback: () => void) => void;
	messageSkipWaiting: () => void;
}

declare global {
	interface Window {
		workbox?: Workbox;
	}
}

export { };