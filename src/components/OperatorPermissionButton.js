import React, { useState, useEffect, useRef} from 'react'
import Button from 'react-bootstrap/Button'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import useIsApprovedForAll from '../hooks/useIsApprovedForAll'

const OperatorPermissionButton = ({ address, onStateSet }) => {
  const [isApproved, handleApprove, handleDisapprove] = useIsApprovedForAll(address);

  useEffect(() => {
    onStateSet(isApproved);
  }, [isApproved]);

  const handleMouseUp = () => {
    if (isApproved) {
      handleDisapprove();
    } else {
      handleApprove();
    }
  };

  const tooltipText = isApproved
    ? "Disallow to modify your account records"
    : "Allow to modify your account records";

  return (
    <div>
      <OverlayTrigger
        placement="left"
        overlay={<Tooltip id={`tooltip-left`}>{tooltipText}</Tooltip>}
      >
        <Button variant="light" onMouseUp={handleMouseUp}>
          {isApproved ? '🟢' : '🔴'}
        </Button>
      </OverlayTrigger>
    </div>
  );
}

export default OperatorPermissionButton