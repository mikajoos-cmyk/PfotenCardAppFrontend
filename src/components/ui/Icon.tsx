
import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: string;
    size?: number | string;
}

const Icon = ({ name, size, ...props }: IconProps) => {
    const icons: { [key: string]: { path: React.ReactNode; customProps?: any } } = {
        dashboard: { path: <><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></> },
        customers: { path: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
        reports: { path: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></> },
        users: { path: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
        user: { path: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
        mail: { path: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></> },
        phone: { path: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></> },
        calendar: { path: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></> },
        logout: { path: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></> },
        arrowLeft: { path: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></> },
        arrowRight: { path: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></> },
        arrowDown: { path: <><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></> },
        check: { path: <><path d="M20 6 9 17l-5-5" /></> },
        x: { path: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> },
        paw: {
            path: (
                <g transform="translate(0,458) scale(0.1,-0.1)">
                    <path d="M1510 4448 c-201 -23 -377 -211 -442 -473 -31 -126 -31 -360 -1 -491 79 -340 287 -605 532 -678 224 -66 471 64 588 311 188 396 39 988 -311 1238 -110 78 -229 108 -366 93z m152 -228 c136 -39 284 -233 354 -465 23 -79 27 -108 28 -240 1 -132 -2 -159 -23 -225 -30 -98 -54 -143 -102 -195 -54 -59 -118 -88 -194 -88 -140 -1 -272 113 -371 318 -59 121 -85 225 -91 365 -13 282 83 491 245 536 48 14 89 12 154 -6z" />
                    <path d="M3278 4440 c-182 -46 -374 -239 -477 -482 -66 -153 -85 -254 -85 -443 -1 -137 3 -173 23 -250 76 -291 272 -474 506 -475 132 0 253 52 368 160 227 212 347 567 308 910 -14 118 -56 256 -104 340 -47 83 -143 175 -224 212 -61 29 -78 33 -173 35 -58 1 -122 -2 -142 -7z m229 -231 c73 -35 144 -141 178 -265 22 -81 30 -271 16 -364 -48 -308 -250 -571 -440 -574 -79 -1 -140 26 -196 85 -178 190 -179 610 -3 906 48 82 145 178 209 208 71 33 173 35 236 4z" />
                    <path d="M385 3032 c-155 -54 -263 -178 -306 -352 -18 -73 -16 -248 4 -332 82 -337 338 -617 604 -658 187 -29 377 77 467 261 89 183 72 408 -50 654 -79 161 -235 326 -371 394 -103 51 -254 66 -348 33z m251 -222 c194 -98 348 -350 361 -591 9 -157 -36 -253 -142 -304 -48 -24 -64 -27 -123 -23 -42 3 -84 14 -112 28 -69 34 -208 182 -252 265 -115 221 -122 475 -15 585 74 76 181 92 283 40z" />
                    <path d="M4340 3035 c-98 -28 -178 -81 -285 -189 -133 -134 -209 -266 -256 -443 -26 -95 -31 -270 -10 -353 37 -146 121 -259 235 -315 203 -101 429 -41 619 165 314 338 354 847 85 1061 -81 64 -128 81 -238 85 -65 3 -112 -1 -150 -11z m213 -209 c41 -16 93 -76 121 -135 27 -60 29 -224 3 -321 -69 -256 -282 -480 -457 -480 -203 0 -297 238 -203 512 69 198 232 385 373 429 41 12 128 10 163 -5z" />
                    <path d="M2333 2589 c-135 -23 -286 -104 -406 -218 -90 -86 -134 -144 -237 -316 -116 -193 -177 -266 -434 -520 -186 -183 -256 -260 -299 -325 -184 -282 -195 -600 -28 -852 162 -244 426 -348 745 -293 47 8 182 46 299 85 297 97 326 103 497 104 176 1 239 -11 505 -99 272 -90 322 -100 495 -99 132 0 152 3 225 28 227 78 384 253 446 495 26 100 26 253 0 352 -57 222 -115 306 -416 604 -259 256 -310 316 -416 490 -98 162 -164 248 -252 332 -125 118 -241 185 -391 223 -85 21 -234 26 -333 9z m327 -229 c185 -63 294 -170 480 -470 114 -185 260 -355 451 -527 190 -170 283 -292 328 -429 28 -85 38 -218 22 -297 -19 -87 -73 -187 -134 -244 -163 -154 -382 -174 -696 -62 -291 104 -507 146 -689 135 -147 -8 -269 -36 -495 -111 -224 -75 -315 -95 -427 -95 -241 0 -436 176 -471 425 -19 135 21 287 112 422 17 27 143 158 279 293 275 272 341 354 490 605 102 173 204 275 332 335 88 41 135 50 253 46 71 -2 119 -10 165 -26z" />
                </g>
            ),
            // WICHTIG: Die viewBox muss angepasst werden, da die Koordinaten im SVG sehr groß sind.
            // Außerdem setzen wir fill auf 'currentColor', damit du die Farbe via CSS ändern kannst.
            customProps: {
                viewBox: "0 0 480 460",
                fill: "currentColor",
                stroke: "none"
            }
        },
        creditCard: { path: <><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></> },
        heart: { path: <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></> },
        trendingUp: { path: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></> },
        edit: { path: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></> },
        trash: { path: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></> },
        file: { path: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></> },
        share: { path: <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></> },
        upload: { path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></> },
        download: { path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></> },
        printer: { path: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></> },
        wifi: { path: <><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" x2="12.01" y1="20" y2="20" /></> },
        refresh: { path: <><path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" /><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2" /></> },
        paperclip: { path: <><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></> },
        menu: { path: <><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></> },
        eye: { path: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></> },
        'eye-off': { path: <><path d="m9.9 9.9 4.2 4.2" /><path d="M10.7 15.3a7 7 0 0 1-8.1-8.1l9.8 9.8" /><path d="M7.5 4.2C9.2 3.3 11.2 3 13 3s3.8.3 5.5 1.2l-2.2 2.2" /><path d="M19.8 17.8a14 14 0 0 1-11.2-4.3l1.5-1.5" /><path d="m2.2 2.2 20 20" /></> },
        plus: { path: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></> },
        copy: { path: <><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></> },
        clock: { path: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> },
        info: { path: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></> },
        mapPin: { path: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></> },
        alertCircle: { path: <><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></> },
        checkCircle: { path: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></> },
        xCircle: { path: <><circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" /></> },
        image: { path: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></> },
        send: { path: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></> },
        message: { path: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></> },
        news: { path: <><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></> },
        bell: { path: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></> },
        alarm: { path: <><path d="M12 21a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z" /><path d="M19.3 17.5a1.43 1.43 0 0 1-1.3-1.4V10a6 6 0 0 0-6-6 6 6 0 0 0-6 6v6.1c0 .8-.5 1.4-1.3 1.4h14.6z" /><path d="M5 4.5l-2-2" /><path d="M19 4.5l2-2" /><path d="M2.5 10h-2" /><path d="M23.5 10h-2" /></> },
        activity: { path: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></> },
        dollar: { path: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></> },
        euro: { path: <><path d="M19 5.5a8 8 0 1 0 0 13" /><path d="M7 9h10" /><path d="M7 15h10" /></> },
        layers: { path: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></> },
        search: { path: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></> },
        camera: { path: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></> },
        'message-circle': { path: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.5 8.5 0 0 1 3.4.7l4.8-1.5z" /></> },
        'arrow-left': { path: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></> },
    };

    const selectedIcon = icons[name];
    if (!selectedIcon) return null;

    const defaultProps = {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
    };

    const finalProps = { ...defaultProps, ...props, ...selectedIcon.customProps };

    const customClassName = props.className || '';
    const width = size || props.width || 24;
    const height = size || props.height || 24;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            className={`icon icon-${name} ${customClassName}`.trim()}
            {...finalProps}
        >
            {selectedIcon.path}
        </svg>
    );
};

export default Icon;
