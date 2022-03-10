import React from "react";
import dayjs from "dayjs";

interface Props {
  date?: string | null;
}

const FormatDate = ({ date }: Props) => {
  if (!date) {
    return <></>;
  } else {
    return <>{dayjs(date).format("DD.MM.YYYY")}</>;
  }
};

export default FormatDate;
