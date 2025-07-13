// logger.js
export function logFreeze(status) {
    console.info(`Freeze: ${status ? 'frozen' : 'unfrozen'}`);
}

export function logRestart() {
    console.info('Restart: simulation restarted and unfrozen');
}

export function logZoom(alreadyZoomed = false) {
    if (alreadyZoomed) {
        console.info('Zoom: already correctly zoomed');
    } else {
        console.info('Zoom: auto-zoom triggered');
    }
}

export function logPromoArrange(alreadyArranged = false) {
    if (alreadyArranged) {
        console.info('Promo arrange: already arranged');
    } else {
        console.info('Promo arrange: arranged by promo');
    }
}

export function logStart() {
    console.info('Start: simulation started');
}