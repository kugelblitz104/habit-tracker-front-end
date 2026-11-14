import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type HTMLAttributes
} from 'react';

type Box = { left: number; top: number; width: number; height: number };

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type SegmentedControlProps = HTMLAttributes<HTMLDivElement> & {
    /** Fill drawn behind the selected option (children keep a transparent background). */
    highlightClassName?: string;
    highlightStyle?: CSSProperties;
};

/**
 * Wrapper for a row of buttons that slides one highlight under whichever child
 * has `aria-pressed` or `aria-selected` true. Children stay plain, caller-styled
 * buttons; the highlight is positioned from the selected child's measured box,
 * so options may differ in width. The first measurement is applied without a
 * transition.
 */
export const SegmentedControl = ({
    highlightClassName = 'rounded-chip',
    highlightStyle,
    className = '',
    children,
    ...props
}: SegmentedControlProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<Box | null>(null);
    const [animate, setAnimate] = useState(false);

    const measure = () => {
        const el = ref.current?.querySelector<HTMLElement>(
            '[aria-pressed=true],[aria-selected=true]'
        );
        const next = el
            ? {
                  left: el.offsetLeft,
                  top: el.offsetTop,
                  width: el.offsetWidth,
                  height: el.offsetHeight
              }
            : null;
        setBox((prev) =>
            prev && next && (Object.keys(next) as (keyof Box)[]).every((k) => prev[k] === next[k])
                ? prev
                : next
        );
    };
    const measureRef = useRef(measure);
    measureRef.current = measure;

    useIsoLayoutEffect(measure);

    useEffect(() => {
        const observer = new ResizeObserver(() => measureRef.current());
        observer.observe(ref.current!);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (box) setAnimate(true);
    }, [box]);

    return (
        <div ref={ref} {...props} className={`relative ${className} [&>button]:relative`}>
            {box && (
                <span
                    aria-hidden='true'
                    className={`pointer-events-none absolute ${highlightClassName} ${
                        animate
                            ? 'motion-safe:transition-[left,top,width,height] motion-safe:duration-(--dur-base) motion-safe:ease-settle'
                            : ''
                    }`}
                    style={{ ...highlightStyle, ...box }}
                />
            )}
            {children}
        </div>
    );
};
