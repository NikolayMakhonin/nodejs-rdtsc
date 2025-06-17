let rdtscDefault = null;
function setRdtscDefault(rdtsc) {
    rdtscDefault = rdtsc;
}
function getRdtscDefault() {
    return rdtscDefault;
}

export { getRdtscDefault, setRdtscDefault };
