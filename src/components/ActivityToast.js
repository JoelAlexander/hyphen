import React from 'react';
import Blockies from 'react-blockies';
import Address from './Address';
import './ActivityToast.css';

const ActivityToast = ({ toast }) => {
    return (
        <div className="activity-toast">
            <Blockies seed={toast.address.toLowerCase()} size={10} scale={5} />
            <div className="activity-toast-info">
                <Address address={toast.address} style={{ fontWeight: 'bold', margin: 0 }} />
                <p>{toast.message}</p>
            </div>
        </div>
    );
};

export default ActivityToast;
