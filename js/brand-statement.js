/**
 * BrandStatementScrollSection
 * Scroll-driven brand statement with word-by-word colour reveal and
 * floating icon cards.  React 18 + Framer Motion 11, loaded via ESM.
 */

import React, { useRef, useState, useEffect } from 'react';
import { createRoot }                          from 'react-dom/client';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from 'framer-motion';

// ─── Design tokens ──────────────────────────────────────────────────────────
const FONT  = 'var(--f-sans, "Saans", system-ui, sans-serif)';
const MUTED = '#61646C';
const BLACK = '#000000';

// ─── Text spans ─────────────────────────────────────────────────────────────
// Each span reveals from MUTED→BLACK over its scroll range [start, end].
// Ranges are deliberately overlapping so the reveal flows smoothly L→R.
const TEXT_SPANS = [
  { id: 's0', text: 'Sesame was built to make ',      range: [0.00, 0.10] },
  { id: 's1', text: 'quality healthcare ',             range: [0.07, 0.17] },
  { id: 's2', text: 'simpler, faster, and ',           range: [0.13, 0.23] },
  { id: 's3', text: 'more affordable. ',               range: [0.19, 0.29] },
  { id: 's4', text: 'No insurance games, ',            range: [0.27, 0.37] },
  { id: 's5', text: 'no surprise bills — ',  range: [0.33, 0.43] },
  { id: 's6', text: 'just clear prices, ',             range: [0.39, 0.49] },
  { id: 's7', text: 'real doctors, ',                  range: [0.44, 0.54] },
  { id: 's8', text: 'and care whenever you need it.', range: [0.50, 0.62] },
];

// ─── Icon cards ─────────────────────────────────────────────────────────────
// Desktop positions are derived from Figma node coordinates in the 1440px frame.
// xOff / yOff = initial offset (drift) from final position; animates to 0.
const ICON_CARDS = [
  // Green — top left  (Figma: x=62.65, y=49.65, 125.2×125.2)
  {
    id: 'ic-green',
    src: 'images/brand/icon-green.png',
    radius: '16px',
    desktop: { size: 125, pos: { left: '4.35%', top: '8%'  }, xOff: -30, yOff:  40, rot: -8, scale: [0.45, 1.0], range: [0.45, 0.73] },
    mobile:  { size:  63, pos: { left: '2.3%',  top: '5%'  }, xOff: -15, yOff:  20, rot:  0, scale: [0.75, 1.0], range: [0.48, 0.78] },
  },
  // Blue — upper right  (Figma: x=809, y=93, 67.28×67.28)
  {
    id: 'ic-blue',
    src: 'images/brand/icon-blue.png',
    radius: '8px',
    desktop: { size:  67, pos: { left: '56.2%', top: '10%' }, xOff:  20, yOff:  30, rot:  6, scale: [0.45, 1.0], range: [0.48, 0.72] },
    mobile:  { size:  45, pos: { right: '2.5%', top: '8%'  }, xOff:  12, yOff:  15, rot:  0, scale: [0.75, 1.0], range: [0.50, 0.78] },
  },
  // Yellow — right side  (Figma: x=972.1, y=382.1, 109.48×109.48)
  {
    id: 'ic-yellow',
    src: 'images/brand/icon-yellow.png',
    radius: '13px',
    desktop: { size: 109, pos: { left: '67.5%', top: '47%' }, xOff:  30, yOff: -20, rot: 10, scale: [0.45, 1.1], range: [0.52, 0.80] },
    mobile:  { size:  88, pos: { right: '3%',   top: '52%' }, xOff:  15, yOff: -10, rot:  0, scale: [0.75, 1.0], range: [0.55, 0.82] },
  },
  // Purple — left below centre  (Figma: x=365.86, y=401.86, 66.28×66.28)
  {
    id: 'ic-purple',
    src: 'images/brand/icon-purple.png',
    radius: '8px',
    desktop: { size:  66, pos: { left: '25.4%', top: '49%' }, xOff: -25, yOff: -15, rot: -5, scale: [0.45, 1.0], range: [0.50, 0.76] },
    mobile:  { size:  66, pos: { left: '3.8%',  top: '52%' }, xOff: -12, yOff:  -8, rot:  0, scale: [0.75, 1.0], range: [0.53, 0.80] },
  },
];

// ─── Press logos ─────────────────────────────────────────────────────────────
// w / h from Figma spec (all logos share h=22px, individual widths vary).
const PRESS_LOGOS = [
  { id: 'l0', src: 'images/brand/press-0.png',                alt: '',              w: 97  },
  { id: 'l1', src: 'images/brand/press-1.png',                alt: '',              w: 56  },
  { id: 'l2', src: 'images/brand/press-bloomberg-740a77.png', alt: 'Bloomberg',     w: 107 },
  { id: 'l3', src: 'images/brand/press-3.png',                alt: '',              w: 129 },
  { id: 'l4', src: 'images/brand/press-forbes-405fe2.png',    alt: 'Forbes',        w: 67  },
  { id: 'l5', src: 'images/brand/press-fox-33ec99.png',       alt: 'Fox',           w: 28  },
  { id: 'l6', src: 'images/brand/press-entrepreneur-52f229.png', alt: 'Entrepreneur', w: 111 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const h = (e) => setMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return mobile;
}

// ─── AnimatedSpan ─────────────────────────────────────────────────────────────
function AnimatedSpan({ text, scrollYProgress, range, reduced }) {
  // Animate both color AND opacity so the reveal is visually distinct —
  // unrevealed phrases sit at muted gray + low opacity, making revealed
  // black text pop clearly against still-unrevealed text.
  const color   = useTransform(scrollYProgress, range, [MUTED, BLACK]);
  const opacity = useTransform(scrollYProgress, range, [0.35, 1]);
  if (reduced) {
    return React.createElement('span', { style: { color: BLACK } }, text);
  }
  return React.createElement(motion.span, { style: { color, opacity } }, text);
}

// ─── AnimatedIcon ─────────────────────────────────────────────────────────────
function AnimatedIcon({ card, scrollYProgress, isMobile, reduced }) {
  const cfg     = isMobile ? card.mobile : card.desktop;
  const scale   = useTransform(scrollYProgress, cfg.range, cfg.scale);
  const opacity = useTransform(
    scrollYProgress,
    [cfg.range[0], cfg.range[0] + 0.07, cfg.range[1]],
    [0, 0.4, 1]
  );
  const x      = useTransform(scrollYProgress, cfg.range, [cfg.xOff, 0]);
  const y      = useTransform(scrollYProgress, cfg.range, [cfg.yOff, 0]);
  const rotate = useTransform(
    scrollYProgress, cfg.range,
    isMobile ? [0, 0] : [cfg.rot, 0]
  );

  const base = {
    position:     'absolute',
    width:        cfg.size,
    height:       cfg.size,
    borderRadius: card.radius,
    overflow:     'hidden',
    willChange:   'transform, opacity',
    ...cfg.pos,
  };

  const animProps = reduced
    ? { style: { ...base, opacity: 1 } }
    : { style: { ...base, scale, opacity, x, y, rotate } };

  return React.createElement(
    motion.div,
    { key: card.id, 'aria-hidden': 'true', ...animProps },
    React.createElement('img', {
      src:   card.src,
      alt:   '',
      style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    })
  );
}

// ─── BrandStatementScrollSection ─────────────────────────────────────────────
function BrandStatementScrollSection() {
  const ref     = useRef(null);
  const reduced = useReducedMotion() ?? false;
  const mobile  = useIsMobile();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end end'],
  });

  // Outer section height creates scroll distance; sticky inner fills viewport.
  const sectionH = mobile ? '150vh' : '200vh';

  // ── Outer scroll container ──────────────────────────────────────────────
  return React.createElement(
    'section',
    {
      ref,
      id:    'brand-statement',
      style: { height: sectionH, position: 'relative' },
    },

    // ── Sticky viewport ───────────────────────────────────────────────────
    React.createElement(
      'div',
      {
        style: {
          position:       'sticky',
          top:            0,
          height:         '100vh',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          overflow:       'hidden',
          background:     '#FFFFFF',
        },
      },

      // Floating icon cards (absolutely positioned)
      ...ICON_CARDS.map((card) =>
        React.createElement(AnimatedIcon, {
          key: card.id,
          card,
          scrollYProgress,
          isMobile: mobile,
          reduced,
        })
      ),

      // ── Centred content ────────────────────────────────────────────────
      React.createElement(
        'div',
        {
          style: {
            position:       'relative',
            zIndex:         1,
            width:          '100%',
            padding:        mobile ? '0 16px' : '0 142px',
            maxWidth:       mobile ? 'none' : '1440px',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            mobile ? '60px' : '80px',
          },
        },

        // Statement text — inline spans share one block of text
        React.createElement(
          'p',
          {
            style: {
              fontFamily:    FONT,
              fontWeight:    mobile ? 600 : 700,
              fontSize:      mobile
                ? 'clamp(28px, 8vw, 32px)'
                : 'clamp(36px, 3.33vw, 48px)',
              lineHeight:    mobile ? 1.1875 : 1.4,
              letterSpacing: '-0.02em',
              textAlign:     'center',
              margin:        0,
              maxWidth:      mobile ? 'none' : '1156px',
            },
          },
          ...TEXT_SPANS.map((s) =>
            React.createElement(AnimatedSpan, {
              key:            s.id,
              text:           s.text,
              scrollYProgress,
              range:          s.range,
              reduced,
            })
          )
        ),

        // ── Press logos ─────────────────────────────────────────────────
        // Figma: "As seen in" label + logos are ALL siblings in one
        // flex-wrap row (row, wrap, gap 40px, justify-content center).
        React.createElement(
          'div',
          {
            style: {
              display:        'flex',
              flexWrap:       'wrap',
              justifyContent: 'center',
              alignItems:     'center',
              gap:            '40px',
              rowGap:         '16px',
              width:          '100%',
            },
          },
          // "As seen in" label — on mobile takes full width so it sits
          // above the logos; on desktop it flows inline with them.
          React.createElement(
            'span',
            {
              style: {
                fontFamily:  FONT,
                fontWeight:  460,
                fontSize:    '16px',
                lineHeight:  1.5,
                color:       MUTED,
                whiteSpace:  'nowrap',
                ...(mobile ? { flexBasis: '100%', textAlign: 'center' } : {}),
              },
            },
            'As seen in'
          ),
          // Logos with Figma-spec widths at h=22px
          ...PRESS_LOGOS.map((logo) =>
            React.createElement('img', {
              key:   logo.id,
              src:   logo.src,
              alt:   logo.alt,
              style: {
                height:     '22px',
                width:      logo.w + 'px',
                objectFit:  'contain',
                opacity:    0.5,
                filter:     'grayscale(1) brightness(0)',
                display:    'block',
                flexShrink: 0,
              },
            })
          )
        )
      )
    )
  );
}

// ─── Mount ───────────────────────────────────────────────────────────────────
const mountEl = document.getElementById('brand-statement-mount');
if (mountEl) {
  createRoot(mountEl).render(
    React.createElement(BrandStatementScrollSection)
  );
}
