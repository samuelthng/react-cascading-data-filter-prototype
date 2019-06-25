import React from "react";
import ReactDOM from "react-dom";

import {
  TableCell,
  Tooltip,
  Paper,
  Toolbar,
  IconButton,
  TextField,
  withMobileDialog,
  Select,
  MenuItem,
  LinearProgress,
  withStyles,
  Popover,
  Card,
  CardContent,
  Grid
} from "@material-ui/core";
import { FilterList } from "@material-ui/icons";
import { useEffect } from "react";
import _ from "lodash";
import { useState } from "react";
import { useCallback } from "react";
import moment from "moment";

import "./styles.css";

console.log(moment("2019-04-23T02:58:50.284Z"));

/**
 * CUSTOM TABLE EXPERIMENT STARTS HERE
 */

// SUPER IMPORTANT!!! Example for Adaptor!

/**
 * Example Adaptor InputProp to RVSDataGrid
 * @description An adapter is a hook that returns loading status and data.
 * @param {number} delay Time in milliseconds before fake async update.
 * @returns {object} `{isLoading, data: { cols, data }}`
 */
const useAdaptor = (delay = 2000) => {
  const [state, setState] = useState({ isLoading: true, response: undefined });

  useEffect(() => {
    if (state.response === undefined)
      setTimeout(() => {
        let response = generateSomeRubbish();
        setState({ isLoading: false, response });
      }, delay);
  }, [state, delay]);

  return state;
};

/**
 * Hook to implement dataset filter.
 * @param {boolean} filters `true` to enable filters, `false` otherwise.
 */
const useTableFilter = filters => {
  const [isLoading, setLoading] = useState(true);
  const [response, setResponse] = useState();
  const [isSearching, setSearching] = useState(false);
  const [filteredData, setFilteredData] = useState();
  const [filterState, setFilter] = useState({});
  const [colTypes, setColType] = useState();
  const [filterAnchor, setFilterAnchor] = useState();

  /******************
   * Filtering Logic *
   ******************/

  /**
   * Filter for number equals to
   * @param {*} data
   * @param {*} key
   * @param {*} target
   */
  const numberEQ = useCallback((data, key, target) =>
    target.trim() === "" ? data : data.filter(d => d[key] === Number(target))
  );

  /**
   * Filter for string
   * @param {*} d
   * @param {*} k
   * @param {*} t
   */
  const stringFilter = useCallback((d, k, t) =>
    d.filter(d => String(d[k]).indexOf(t) > -1)
  );

  /**
   * Filter for Boolean
   * @param {*} d
   * @param {*} k
   * @param {*} t
   */
  const booleanFilter = useCallback((d, k, t) =>
    t === undefined ? d : d.filter(d => Boolean(d[k]) === t)
  );

  /*******************
   * Helper Functions *
   *******************/

  /**
   * Callback function for controller to update on adapter loading status.
   * @param {object} `{ isLoading, response }`, typical object returned by a table adapter.
   */
  const updateFilters = useCallback(
    ({ isLoading, response }) => {
      setLoading(isLoading);
      setResponse(response);
    },
    [isLoading, response]
  );

  /**
   * Evaluates column data types and sets `colTypes` when successful.
   */
  const evalColTypes = useCallback(() => {
    const flatColLabel = Array.from(
      new Set(response.cols.map(c => (c.label ? c.label : c)))
    );

    var t0 = performance.now();

    // for each row, check their column for new items.
    let types = {};
    flatColLabel.forEach(label => {
      types[label] = Array.from(
        new Set(
          response.data.map(d =>
            typeof d[label] === "string" && moment(d).isValid()
              ? "datetime"
              : typeof d[label]
          )
        )
      );
    });
    console.log(types[0]);
    setColType(types);

    var t1 = performance.now();
    console.log({ types, time: t1 - t0 });
  }, [response]);

  /**
   * Performs filter and populates `filteredData`.
   *
   * Note: Does nothing when no `filterState` is set, or `filters` is `false`, just populates `filteredData` with a deep copy of `response.data` from adapter.
   */
  const performFilter = useCallback(() => {
    setSearching(true);
    let tempData = [...response.data];

    if (filters) {
      console.log("Filters", filterState);
      _.toPairs(filterState).forEach(([key, target], index) => {
        console.log("ColType:", colTypes[key]);
        if (colTypes[key].length === 1) {
          switch (colTypes[key][0]) {
            case "number": {
              console.log("Processing number filter for column: ", key);
              tempData = numberEQ(tempData, key, target);
              break;
            }

            case "string": {
              console.log("Processing string filter for column: ", key);
              tempData = stringFilter(tempData, key, target);
              break;
            }

            case "boolean": {
              console.log("Processing boolean filter for column: ", key);
              tempData = booleanFilter(tempData, key, target);
              break;
            }

            default:
              break;
          }
        } else if (colTypes[key].length > 1) {
          console.warn("More than one type in colLabel: ", key);
          // Process as string.
        }
      });
    }

    console.log("Filtered", tempData);

    // Update when required.
    setFilteredData(tempData);
    setSearching(false);
  }, [
    response,
    colTypes,
    numberEQ,
    stringFilter,
    booleanFilter,
    filterState,
    filters
  ]);

  /******************
   * Filter UI Nodes *
   ******************/

  /**
   * Common props used in generated React `TextField` components.
   * @param {*} k Key of columns.
   * @returns {object} Props to spread over a `TextField` component.
   */
  const textFieldProps = k => ({
    variant: "outlined",
    fullWidth: true,
    label: k,
    value: filterState[k],
    onChange: e => setFilter({ ...filterState, [k]: e.target.value })
  });

  /**
   * IconButton with Popover to display filter forms based on dataset.
   */
  const filterElements = (
    <div>
      <Tooltip title="Filter">
        <IconButton
          onClick={e => setFilterAnchor(e.currentTarget)}
          disabled={Boolean(filterAnchor)}
        >
          <FilterList />
        </IconButton>
      </Tooltip>
      <Popover
        id="filter-list"
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(undefined)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
      >
        <Card>
          <CardContent>
            <Grid container spacing={8} direction="column">
              {colTypes &&
                _.toPairs(colTypes).map(([key, [type]], index) => {
                  switch (type) {
                    case "number":
                    case "string":
                      return (
                        <Grid item>
                          <TextField {...textFieldProps(key)} />
                        </Grid>
                      );

                    case "boolean":
                      return (
                        <Grid item>
                          <TextField
                            select
                            {...textFieldProps(key)}
                            value={filterState[key] ? filterState[key] : " "}
                          >
                            {[
                              [undefined, "Any"],
                              [true, "True"],
                              [false, "False"]
                            ].map(o => (
                              <MenuItem value={o[0]}>{o[1]}</MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      );

                    case "custom":
                      return <></>;

                    default:
                      return null;
                  }
                })}
            </Grid>
          </CardContent>
        </Card>
      </Popover>
    </div>
  );

  /******************
   * Hook Lifecycles *
   ******************/

  // When data is ready.
  useEffect(() => {
    if (!isLoading && response) {
      // Evaluate column types when response is ready.
      evalColTypes();
    }
  }, [response, isLoading, evalColTypes]);

  // Perform Filters every time.
  useEffect(() => {
    if (!isLoading && colTypes) {
      performFilter();
    }
  }, [response, filterState, isLoading, colTypes, performFilter]);

  // Return values for hook.
  return [filters ? filterElements : null, filteredData, updateFilters];
};

const RVSDataGrid = withMobileDialog({ breakpoint: "xs" })(
  ({ classes, fullScreen, adapter, filters }) => {
    const datasource = adapter();
    const { isLoading } = datasource;
    const [FilterNode, filteredData, updateFilters] = useTableFilter(filters);

    // Update filters
    useEffect(() => updateFilters(datasource), [datasource, updateFilters]);

    // Check if data is ready
    if (isLoading)
      return (
        <RVSDataGridPaper>
          <LinearProgress />
        </RVSDataGridPaper>
      );
    return (
      <RVSDataGridPaper>
        <Paper
          square
          elevation={1}
          color="inherit"
          style={{ position: "sticky" }}
        >
          <Toolbar>
            <div className="ml-auto" />
            {FilterNode}
          </Toolbar>
        </Paper>
        {JSON.stringify(filteredData)}
      </RVSDataGridPaper>
    );
  }
);

/**
 * Convenience Rubbish
 */

const DataGridPaperStyle = {
  paper: {
    height: "100%",
    overflowY: "auto"
  }
};

const RVSDataGridPaper = withStyles(DataGridPaperStyle)(
  ({ classes, children, ...props }) => (
    <main>
      <Paper className={classes.paper} {...props}>
        {children}
      </Paper>
    </main>
  )
);

const dummyTableDataRow = rowID => ({
  String: `someItem-${rowID}`,
  Number: rowID,
  Boolean: Boolean(rowID % 2),
  Custom: dummyOptions[Number(rowID % 2)],
  ISO: moment()
    .add(-rowID, "days")
    .toISOString(),
  Locale: moment()
    .add(-rowID, "days")
    .toLocaleString()
});

const dummyTableData = num => {
  let data = [];
  while (data.length < num) {
    data.push(dummyTableDataRow(data.length));
  }
  return data;
};

const dummyOptions = ["Option A", "Option B", "Option C"];

const generateSomeRubbish = (numOfRubbish = 1000) => {
  /**
   * Incoming Props
   */
  const data = dummyTableData(numOfRubbish);
  const cols = [
    "String",
    {
      label: "Number",
      type: "number"
    },
    {
      label: "Boolean",
      type: "boolean"
    },
    {
      label: "Custom",
      title: "Custom Row",
      renderCell: ({ colIndex, rowIndex, data, isEdit, setEdit, ...col }) => (
        <TableCell key={colIndex + rowIndex}>
          <Select
            fullWidth
            value={data}
            onChange={event =>
              console.log(`Changed!`, {
                event,
                colIndex,
                rowIndex,
                data,
                isEdit,
                setEdit,
                ...col
              })
            }
          >
            {dummyOptions.map((opt, idx) => (
              <MenuItem value={opt} key={opt + idx}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </TableCell>
      )
    }
  ];

  return { cols, data };
};

const onRowClicked = (rowID, rowEntry) =>
  console.log(`Row clicked!`, { rowID, rowEntry });

const onCellClicked = (colID, rowID, cellEntry) =>
  console.log(`Cell clicked!`, { colID, rowID, cellEntry });

const rootElement = document.getElementById("root");
ReactDOM.render(<RVSDataGrid adapter={useAdaptor} filters />, rootElement);
