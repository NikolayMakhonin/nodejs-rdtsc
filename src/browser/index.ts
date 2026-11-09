import {setRdtscDefault} from '../rdtscDefault'
import {rdtscJs} from '../rdtscJs'

// In browsers, calcPerformance uses performance.now() by default and cannot measure garbage collection
setRdtscDefault(rdtscJs)

export * from '../common'
