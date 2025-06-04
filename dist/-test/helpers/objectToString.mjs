function objectToString(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'bigint') {
            return value + 'n';
        }
        return value;
    });
}

export { objectToString };
