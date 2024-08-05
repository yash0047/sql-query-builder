import React, { useState } from "react";
import Select from "react-select";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SQLQueryBuilder = () => {
  const tables = [
    { name: "Categories", columns: ["CategoryID", "CategoryName"] },
    {
      name: "Products",
      columns: ["ProductID", "ProductName", "Price", "CategoryID"],
    },
    {
      name: "Orders",
      columns: ["OrderID", "ProductID", "Quantity", "OrderDate"],
    },
  ];

  const relationships = {
    Categories: ["Products"],
    Products: ["Orders"],
    Orders: [],
  };

  const [query, setQuery] = useState("");
  const [selectedTables, setSelectedTables] = useState([
    { table: "", columns: [] },
  ]);
  const [joins, setJoins] = useState([
    { table1: "", column1: "", table2: "", column2: "", type: "INNER" },
  ]);
  const [whereConditions, setWhereConditions] = useState([
    { column1: "", operator: "=", column2: "" },
  ]);
  const [groupBy, setGroupBy] = useState("");
  const [orderBy, setOrderBy] = useState({ column: "", direction: "ASC" });
  const [limit, setLimit] = useState("");
  const [offset, setOffset] = useState("");

  const handleAddTableRow = () => {
    setSelectedTables([...selectedTables, { table: "", columns: [] }]);
  };

  const handleAddJoinRow = () => {
    setJoins([
      ...joins,
      { table1: "", column1: "", table2: "", column2: "", type: "INNER" },
    ]);
  };

  const handleAddWhereCondition = () => {
    setWhereConditions([
      ...whereConditions,
      { column1: "", operator: "=", column2: "" },
    ]);
  };

  const handleTableChange = (index, selectedOption) => {
    const tableName = selectedOption ? selectedOption.value : "";
    const updatedTables = selectedTables.map((table, i) =>
      i === index ? { ...table, table: tableName, columns: [] } : table
    );
    setSelectedTables(updatedTables);
    setJoins([
      { table1: "", column1: "", table2: "", column2: "", type: "INNER" },
    ]);
    setWhereConditions([{ column1: "", operator: "=", column2: "" }]);
    setGroupBy("");
    setOrderBy({ column: "", direction: "ASC" });
  };

  const handleColumnChange = (index, selectedOptions) => {
    const updatedTables = selectedTables.map((table, i) => {
      if (i === index) {
        return {
          ...table,
          columns: selectedOptions.map((option) => option.value),
        };
      }
      return table;
    });
    setSelectedTables(updatedTables);
  };

  const getCombinedOptions = () => {
    const selectedTableNames = selectedTables.map((table) => table.table);
    const relatedColumnOptionsSet = new Set();
    selectedTableNames.forEach((tableName) => {
      const relatedTables = relationships[tableName] || [];
      relatedTables.forEach((relatedTableName) => {
        if (selectedTableNames.includes(relatedTableName)) {
          const table = tables.find((t) => t.name === tableName);
          const relatedTable = tables.find((t) => t.name === relatedTableName);
          if (table && relatedTable) {
            table.columns.forEach((column) => {
              if (relatedTable.columns.includes(column)) {
                relatedColumnOptionsSet.add(`${tableName}.${column}`);
                relatedColumnOptionsSet.add(`${relatedTableName}.${column}`);
              }
            });
          }
        }
      });
    });

    return Array.from(relatedColumnOptionsSet).map((option) => ({
      value: option,
      label: option,
    }));
  };

  const handleJoinChange = (index, field, value) => {
    const [table, column] = value.split(".");
    const updatedJoins = joins.map((join, i) => {
      if (i === index) {
        return field === "table1.column1"
          ? { ...join, table1: table, column1: column }
          : { ...join, table2: table, column2: column };
      }
      return join;
    });
    setJoins(updatedJoins);
  };

  const handleWhereConditionChange = (index, field, value) => {
    let validValue = value;
    if (field === "column2") {
      const numericValue = parseInt(value);
      if (!isNaN(numericValue) && numericValue < 0) {
        validValue = "";
      }
    }
    const updatedConditions = whereConditions.map((condition, i) => {
      if (i === index) {
        const newCondition = { ...condition, [field]: validValue };
        if (
          field === "operator" &&
          (value === "IS NULL" || value === "IS NOT NULL")
        ) {
          newCondition.column2 = "";
        }
        return newCondition;
      }
      return condition;
    });
    setWhereConditions(updatedConditions);
  };

  const generateSQLQuery = () => {
    if (selectedTables[0]?.table == "") {
      return toast.error("Select at least one table!");
    }
    if (selectedTables[1]?.table == "") {
      return toast.error("Select Second table!");
    }

    if (
      selectedTables.length > 1 &&
      (joins.length === 0 || (joins.length === 1 && joins[0].column1 === ""))
    ) {
      return toast.error("Joins are required when selecting multiple tables!");
    }

    let query = "SELECT ";

    // Select columns
    const selectedColumns = selectedTables
      .flatMap((table) =>
        table.columns.map((column) => `${table.table}.${column}`)
      )
      .filter(Boolean)
      .join(", ");
    query += selectedColumns || "*";

    // From clause
    const fromTables = selectedTables[0]?.table;
    if (fromTables) {
      query += ` FROM ${fromTables}`;
    }

    // Joins
    joins.forEach((join) => {
      if (
        join.table1 &&
        join.column1 &&
        join.table2 &&
        join.column2 &&
        join.type
      ) {
        query += ` ${join.type} JOIN ${join.table2} ON ${join.table1}.${join.column1} = ${join.table2}.${join.column2}`;
      }
    });

    if (whereConditions.length > 0 && whereConditions[0].column1 != "" && whereConditions[0].column2 == "" && !whereConditions[0].operator.includes("NULL")) {
      return toast.error("Enter Value Of Where Condition!");
    }
    // Where conditions
    if (whereConditions.length > 0 && whereConditions[0].column1 != "") {
      const whereClauses = whereConditions.map((condition) => {
        if(condition.column2 == '' && !condition.operator.includes("NULL"))
        {
          return toast.error("Enter Value Of Where Condition!");
        }
        if (condition.operator.includes("NULL")) {
          return `${condition.column1} ${condition.operator}`;
        }
        return `${condition.column1} ${condition.operator} ${condition.column2}`;
      });
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    // Group by
    if (groupBy.length > 0) {
      query += ` GROUP BY ${groupBy}`;
    }

    // Order by
    if (orderBy.column) {
      query += ` ORDER BY ${orderBy.column} ${orderBy.direction}`;
    }

    // Limit and offset
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    if (selectedTables.length === 1 && fromTables) {
      setQuery(query);
    } else if (
      selectedTables.length > 1 &&
      (joins.length === 0 || (joins.length === 1 && joins[0].column1 !== ""))
    ) {
      setQuery(query);
    } else {
      setQuery(""); // Clear the query if conditions are not met
    }
  };

  const getAllPossibleColumns = () => {
    const selectedTableNames = selectedTables.map(
      (selectedTable) => selectedTable.table
    );

    const allColumns = tables
      .filter((table) => selectedTableNames.includes(table.name))
      .flatMap((table) =>
        table.columns.map((column) => ({
          value: `${table.name}.${column}`,
          label: `${table.name}.${column}`,
        }))
      );

    return allColumns;
  };

  const getTableOptions = () => {
    const selectedTableNames = selectedTables.map((table) => table.table);
    const maxRowsAllowed =
      Object.values(relationships).reduce(
        (max, rels) => Math.max(max, rels.length),
        0
      ) + 1;
    const isFirstTableProducts = selectedTableNames[0] === 'Orders';
    if (isFirstTableProducts) {
      if (selectedTableNames.length >= maxRowsAllowed) {
        return [];
      }
    } else {
      if (selectedTableNames.length >= maxRowsAllowed + 1) {
        return [];
      }
    }

    if (selectedTableNames.length === 1) {
      return tables.map((table) => ({ value: table.name, label: table.name }));
    }

    const relatedTables = selectedTableNames.flatMap(
      (name) => relationships[name] || []
    );

    const availableOptions = tables
      .filter(
        (table) =>
          !selectedTableNames.includes(table.name) &&
          relatedTables.includes(table.name)
      )
      .map((table) => ({ value: table.name, label: table.name }));

    if (availableOptions.length > 0) {
      return availableOptions;
    }

    return tables
      .filter((table) => !selectedTableNames.includes(table.name))
      .map((table) => ({ value: table.name, label: table.name }));
  };

  const getColumnOptions = (selectedTableName) => {
    const table = tables.find((t) => t.name === selectedTableName);
    if (!table) return [];

    return table.columns.map((column) => ({
      value: column,
      label: column,
    }));
  };

  return (
    <div className="container">
      <h1 className="mb-5">SQL Query Builder</h1>

      {/* Table and Column Selection */}
      <h5 style={{ textAlign: "left" }}>Select Tables and Columns</h5>

      <div className="row mb-3">
        <div className="col-10">
          {selectedTables.map((table, index) => (
            <div key={index} className="form-row mb-2">
              <div className="row">
                <div className="col-6">
                  <Select
                    options={getTableOptions()}
                    value={
                      table.table
                        ? { value: table.table, label: table.table }
                        : null
                    }
                    onChange={(selectedOption) =>
                      handleTableChange(index, selectedOption)
                    }
                    placeholder="Select Table"
                  />
                </div>
                <div className="col-6">
                  <Select
                    isMulti
                    options={getColumnOptions(table.table)}
                    value={table.columns.map((column) => ({
                      value: column,
                      label: column,
                    }))}
                    onChange={(selectedOptions) =>
                      handleColumnChange(index, selectedOptions)
                    }
                    placeholder="Select Columns"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="col-2">
          <button className="btn btn-primary mb-3" onClick={handleAddTableRow}>
            <i className="fa fa-plus" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      {/* Join Conditions */}
      {selectedTables.length > 1 && (
        <>
          <h5 style={{ textAlign: "left" }}>Join Conditions</h5>

          <div className="row">
            <div className="col-10">
              {joins.map((join, index) => (
                <div key={index} className="form-row mb-2">
                  <div className="row mb-3">
                    <div className="col-4">
                      <Select
                        options={getCombinedOptions()}
                        value={
                          join.table1 && join.column1
                            ? {
                                value: `${join.table1}.${join.column1}`,
                                label: `${join.table1}.${join.column1}`,
                              }
                            : null
                        }
                        onChange={(selectedOption) =>
                          handleJoinChange(
                            index,
                            "table1.column1",
                            selectedOption ? selectedOption.value : ""
                          )
                        }
                        placeholder="Select Table1.Column1"
                      />
                    </div>
                    <div className="col-4">
                      <Select
                        options={[
                          { value: "INNER", label: "INNER JOIN" },
                          { value: "LEFT", label: "LEFT JOIN" },
                          { value: "RIGHT", label: "RIGHT JOIN" },
                          { value: "FULL", label: "FULL JOIN" },
                        ]}
                        value={
                          join.type
                            ? { value: join.type, label: join.type }
                            : null
                        }
                        onChange={(selectedOption) =>
                          setJoins(
                            joins.map((j, i) =>
                              i === index
                                ? {
                                    ...j,
                                    type: selectedOption
                                      ? selectedOption.value
                                      : "",
                                  }
                                : j
                            )
                          )
                        }
                        placeholder="Select Join Type"
                      />
                    </div>
                    <div className="col-4">
                      <Select
                        options={getCombinedOptions()}
                        value={
                          join.table2 && join.column2
                            ? {
                                value: `${join.table2}.${join.column2}`,
                                label: `${join.table2}.${join.column2}`,
                              }
                            : null
                        }
                        onChange={(selectedOption) =>
                          handleJoinChange(
                            index,
                            "table2.column2",
                            selectedOption ? selectedOption.value : ""
                          )
                        }
                        placeholder="Select Table2.Column2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="col-2">
              <button
                className="btn btn-primary mb-3"
                onClick={handleAddJoinRow}
              >
                <i className="fa fa-plus" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Where Conditions */}
      <h5 style={{ textAlign: "left" }}>Where Conditions</h5>

      <div className="row">
        <div className="col-10">
          {whereConditions.map((condition, index) => (
            <div key={index} className="form-row mb-2">
              <div className="row mb-3">
                <div className="col-4">
                  <Select
                    options={getAllPossibleColumns()}
                    value={
                      condition.column1
                        ? { value: condition.column1, label: condition.column1 }
                        : null
                    }
                    onChange={(selectedOption) =>
                      handleWhereConditionChange(
                        index,
                        "column1",
                        selectedOption ? selectedOption.value : ""
                      )
                    }
                    placeholder="Select Column"
                  />
                </div>
                <div className="col-4">
                  <Select
                    options={[
                      { value: "=", label: "=" },
                      { value: "!=", label: "!=" },
                      { value: ">", label: ">" },
                      { value: "<", label: "<" },
                      { value: ">=", label: ">=" },
                      { value: "<=", label: "<=" },
                      { value: "IS NULL", label: "IS NULL" },
                      { value: "IS NOT NULL", label: "IS NOT NULL" },
                    ]}
                    value={
                      condition.operator
                        ? {
                            value: condition.operator,
                            label: condition.operator,
                          }
                        : null
                    }
                    onChange={(selectedOption) =>
                      handleWhereConditionChange(
                        index,
                        "operator",
                        selectedOption ? selectedOption.value : ""
                      )
                    }
                    placeholder="Select Operator"
                  />
                </div>
                <div className="col-4">
                  <input
                    className="form-control"
                    placeholder="Enter Value"
                    type="text"
                    value={condition.column2}
                    onChange={(e) =>
                      handleWhereConditionChange(
                        index,
                        "column2",
                        e.target.value
                      )
                    }
                    disabled={
                      condition.operator.includes("NULL") ||
                      condition.operator.includes("IS NOT NULL")
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="col-2">
          <button
            className="btn btn-primary mb-3"
            onClick={handleAddWhereCondition}
          >
            <i className="fa fa-plus" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      {/* Group By, Order By, Limit, and Offset */}
      <div className="row">
        <div className="col-6">
          <h5 style={{ textAlign: "left" }}>Group By</h5>
          <Select
            options={getAllPossibleColumns()}
            value={groupBy ? { value: groupBy, label: groupBy } : null}
            onChange={(selectedOption) =>
              setGroupBy(selectedOption?.value || "")
            }
            placeholder="Select Columns"
          />
        </div>
        <div className="col-6">
          <h5 style={{ textAlign: "left" }}>Order By</h5>
          <div className="row mb-3">
            <div className="col-8">
              <Select
                options={getAllPossibleColumns()}
                value={
                  orderBy.column
                    ? { value: orderBy.column, label: orderBy.column }
                    : null
                }
                onChange={(selectedOption) =>
                  setOrderBy((prev) => ({
                    ...prev,
                    column: selectedOption?.value || "",
                  }))
                }
                placeholder="Select Column"
              />
            </div>
            <div className="col-4">
              <Select
                options={[
                  { value: "ASC", label: "ASC" },
                  { value: "DESC", label: "DESC" },
                ]}
                value={{ value: orderBy.direction, label: orderBy.direction }}
                onChange={(selectedOption) =>
                  setOrderBy((prev) => ({
                    ...prev,
                    direction: selectedOption?.value || "",
                  }))
                }
                placeholder="Direction"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-6">
          <h5 style={{ textAlign: "left" }}>Limit</h5>
          <input
            min="1"
            type="number"
            className="form-control mb-2"
            placeholder="Limit"
            value={limit}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || parseInt(value) > 0) {
                setLimit(value);
              }
            }}
          />
        </div>
        <div className="col-6">
          <h5 style={{ textAlign: "left" }}>Offset</h5>
          <input
            min="1"
            type="number"
            className="form-control mb-2"
            placeholder="Offset"
            value={offset}
            onChange={(e) => {
              const value = e.target.value;
              if (
                value === "" ||
                (parseInt(value) >= 0 && parseInt(value) <= parseInt(limit))
              ) {
                setOffset(value);
              }
            }}
          />
        </div>
      </div>

      {/* Generate SQL Query Button */}
      <button
        className="btn btn-success mt-3 mb-3"
        onClick={() => generateSQLQuery()}
      >
        Generate SQL Query
      </button>
      <ToastContainer />
      {query && (
        <div>
          <h3>Generated SQL Query:</h3>
          <pre>{query}</pre>
        </div>
      )}

      {/* Output */}
      {/* <h5 style={{ textAlign: "left" }}>Generated SQL Query</h5>
      <div>
        <pre>{generateSQLQuery()}</pre>
      </div> */}
    </div>
  );
};

export default SQLQueryBuilder;
