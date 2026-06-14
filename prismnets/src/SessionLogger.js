/**
 * Port of Assets/Scripts/Logging/SessionLogger.cs (local-JSON path only).
 * Buffers interaction events in memory; export() downloads them as JSON, the web
 * equivalent of the C# WriteLocal fallback. Swap export() for a fetch() POST to send
 * to a server when you set up remote collection.
 */
export function netStateString(faces) {
  return faces.map((f) => (f.unfolded ? '1' : '0')).join('');
}

export class SessionLogger {
  constructor() {
    this.sessionId = null;
    this.startTime = 0;
    this.events = [];
    this.active = false;
    this.onEvent = null; // (entry) => void — UI hooks (onboarding) observe the stream
  }

  startSession() {
    this.sessionId = cryptoRandomId();
    this.startTime = performance.now();
    this.events = [];
    this.active = true;
    this.append('session_start', null);
  }

  endSession() {
    if (!this.active) return;
    this.append('session_end', null);
    this.active = false;
  }

  logHoverEnter(edgeId, faceId) { this.append('hover_enter', { edgeId, faceId }); }
  logHoverExit(edgeId, faceId, dwellTime) { this.append('hover_exit', { edgeId, faceId, dwellTime }); }
  logUnfold(edgeId, faceId, netState) { this.append('unfold', { edgeId, faceId, netState }); }
  logFold(edgeId, faceId, netState) { this.append('fold', { edgeId, faceId, netState }); }
  logReset(netState) { this.append('reset', { netState }); }
  logNetComplete(netState) { this.append('net_complete', { netState }); }

  append(type, data) {
    if (!this.active && type !== 'session_start') return;
    const entry = data ? { ...data } : {};
    entry.type = type;
    entry.t = (performance.now() - this.startTime) / 1000; // seconds
    this.events.push(entry);
    this.onEvent?.(entry);
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      startTime: new Date(Date.now() - (performance.now() - this.startTime)).toISOString(),
      endTime: new Date().toISOString(),
      eventCount: this.events.length,
      events: this.events,
    };
  }

  export() {
    const blob = new Blob([JSON.stringify(this.toJSON(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${this.sessionId || 'unsaved'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function cryptoRandomId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
