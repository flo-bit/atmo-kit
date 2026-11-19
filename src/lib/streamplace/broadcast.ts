import { NODE } from './api.js';

export type BroadcastState = 'connecting' | 'live' | 'reconnecting' | 'stopped' | 'failed';

/** Sends a camera or screen capture to the node over WHIP until stopped. */
export function startBroadcast(
	media: MediaStream,
	streamKey: string,
	onstate: (state: BroadcastState) => void
) {
	let stopped = false;
	let pc: RTCPeerConnection | undefined;
	let retry: ReturnType<typeof setTimeout> | undefined;
	let attempts = 0;

	async function connect() {
		if (stopped) return;
		pc?.close();
		const connection = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
		pc = connection;
		for (const track of media.getTracks()) {
			const transceiver = connection.addTransceiver(track, { direction: 'sendonly' });
			if (track.kind !== 'video') continue;
			// The node records H.264; offer it first where the browser can encode it.
			const codecs = RTCRtpSender.getCapabilities?.('video')?.codecs ?? [];
			const h264 = codecs.filter((codec) => codec.mimeType === 'video/H264');
			if (h264.length) {
				transceiver.setCodecPreferences([
					...h264,
					...codecs.filter((codec) => !h264.includes(codec))
				]);
			}
		}
		connection.onconnectionstatechange = () => {
			if (connection !== pc || stopped) return;
			if (connection.connectionState === 'connected') {
				attempts = 0;
				onstate('live');
			} else if (connection.connectionState === 'failed') {
				again();
			}
		};
		try {
			await connection.setLocalDescription(await connection.createOffer());
			await new Promise<void>((resolve) => {
				if (connection.iceGatheringState === 'complete') return resolve();
				const timer = setTimeout(resolve, 1000);
				connection.addEventListener('icegatheringstatechange', () => {
					if (connection.iceGatheringState !== 'complete') return;
					clearTimeout(timer);
					resolve();
				});
			});
			const response = await fetch(`${NODE}/api/ingest/webrtc`, {
				method: 'POST',
				headers: { 'content-type': 'application/sdp', authorization: `Bearer ${streamKey}` },
				body: connection.localDescription?.sdp
			});
			if (stopped || connection !== pc) return;
			if (response.status === 401 || response.status === 403) {
				stopped = true;
				connection.close();
				return onstate('failed');
			}
			if (!response.ok) return again();
			await connection.setRemoteDescription({ type: 'answer', sdp: await response.text() });
		} catch {
			again();
		}
	}

	function again() {
		if (stopped) return;
		attempts += 1;
		onstate('reconnecting');
		retry = setTimeout(connect, Math.min(8000, 1000 * attempts));
	}

	onstate('connecting');
	void connect();

	return () => {
		stopped = true;
		clearTimeout(retry);
		pc?.close();
		onstate('stopped');
	};
}
