import { useContext } from "react";
import { TableDragConnectSourceContext } from "@components/table/HassuTable";

const useTableDragConnectSourceContext = () => useContext(TableDragConnectSourceContext);

export default useTableDragConnectSourceContext;
