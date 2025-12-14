
import React, { FC } from 'react';
import Icon from './Icon';

interface KpiCardProps {
    title: string;
    value: string;
    icon: string;
    bgIcon: string;
    color: 'green' | 'orange' | 'blue' | 'purple';
    onClick?: () => void;
}

const KpiCard: FC<KpiCardProps> = ({ title, value, icon, bgIcon, color, onClick }) => {
    const cardContent = (
        <article className={`kpi-card ${color}`}>
            <div className={`icon-bg ${color}`}><Icon name={icon} /></div>
            <div className="text">
                <h3>{title}</h3>
                <p className="value">{value}</p>
            </div>
        </article>
    );

    return onClick ? <button onClick={onClick} className="kpi-card-button">{cardContent}</button> : cardContent;
};

export default KpiCard;
