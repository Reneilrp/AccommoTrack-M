const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

let reporter = null;

export const setLoggerReporter = (nextReporter) => {
    reporter = typeof nextReporter === 'function' ? nextReporter : null;
};

const buildPayload = (args) => {
    if (!args || args.length === 0) {
        return { message: '', meta: undefined };
    }

    const [first, ...rest] = args;
    let message = '';

    if (typeof first === 'string') {
        message = first;
    } else if (first instanceof Error) {
        message = first.message || 'Unknown error';
    } else {
        try {
            message = JSON.stringify(first);
        } catch (err) {
            message = String(first);
        }
    }

    return {
        message,
        meta: rest.length ? rest : undefined,
    };
};

const report = (level, args) => {
    if (!reporter) return;

    const payload = buildPayload(args);
    try {
        reporter({
            level,
            message: payload.message,
            meta: payload.meta,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        if (isDev) {
            console.warn('Logger reporter failed', err);
        }
    }
};

const devLog = (method, args) => {
    if (!isDev) return;
    const target = console[method] || console.log;
    target.apply(console, args);
};

export const logger = {
    debug: (...args) => {
        devLog('log', args);
    },
    info: (...args) => {
        devLog('info', args);
    },
    warn: (...args) => {
        report('warn', args);
        devLog('warn', args);
    },
    error: (...args) => {
        report('error', args);
        devLog('error', args);
    },
};
