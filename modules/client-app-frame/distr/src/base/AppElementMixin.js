// Local modules -- start
import { SharedStyles } from './../styles/shared-styles.js'
import { fadeInFrames } from '../styles/shared-styles-animations.js'
// Local modules -- end

export const AppElementMixin = (base) => {

  return class Base extends base {
    static get styles () {
      return [
        SharedStyles,
        fadeInFrames,
        css`
          [main] {
            box-sizing: border-box;
            padding: 10px;
            width: 100vw;
            height: calc(100vh - 48px);
            overflow: auto;
            overflow-x: hidden;
            scroll-behavior: smooth;
          }

          ee-toolbar.utils {
            background: white;
            padding: 5px;
            align-items: start;
          }

          ee-toolbar.utils .toggle {
              display: none;
            }

          @media (max-width: 800px) {
            ee-toolbar.utils {
              display: block;
              flex-direction: column;
              flex-wrap: wrap;
              max-height: unset;
            }
          }
        `
      ]
    }

    render () {}
  }
}
