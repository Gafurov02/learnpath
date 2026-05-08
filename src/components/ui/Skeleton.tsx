'use client';

type Props = {
    width?: string | number;
    height?: string | number;
    radius?: number;
};

export function Skeleton({
                             width = '100%',
                             height = 20,
                             radius = 12,
                         }: Props) {
    return (
        <>
            <div
                style={{
                    width,
                    height,
                    borderRadius: radius,
                    background:
                        'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 37%, rgba(255,255,255,0.04) 63%)',
                    backgroundSize: '400% 100%',
                    animation: 'skeleton-loading 1.4s ease infinite',
                }}
            />

            <style jsx>{`
        @keyframes skeleton-loading {
          0% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0 50%;
          }
        }
      `}</style>
        </>
    );
}