import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";


function fmt(n) {
  return new Intl.NumberFormat("en-CA").format(
    Math.round(Number(n || 0))
  );
}


function pct(v, digits = 1) {
  return `${(Number(v || 0) * 100).toFixed(digits)}%`;
}


function riskColour(probability) {
  const p = Number(probability || 0);

  if (p >= 0.8) return "#991b1b";
  if (p >= 0.6) return "#ef4444";
  if (p >= 0.4) return "#f97316";
  if (p >= 0.2) return "#f59e0b";

  return "#22c55e";
}


function binaryColour(label) {
  return label === "Destroyed"
    ? "#ef4444"
    : "#22c55e";
}


function errorColour(classification) {
  switch (classification) {
    case "TP":
      return "#16a34a";

    case "TN":
      return "#2563eb";

    case "FP":
      return "#f59e0b";

    case "FN":
      return "#dc2626";

    default:
      return "#64748b";
  }
}


function MetricBox({ label, value, note }) {
  return (
    <div className="wildfire-metric-box">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}


function ErrorBox({ label, value, tone, note }) {
  return (
    <div className={`wildfire-error-box ${tone}`}>
      <span>{label}</span>
      <strong>{fmt(value)}</strong>
      <small>{note}</small>
    </div>
  );
}


export default function WildfireIntelligence() {
  const [summary, setSummary] = useState(null);
  const [buildings, setBuildings] = useState(null);

  const [mode, setMode] = useState("Risk");
  const [errorFilter, setErrorFilter] = useState("All");

  const [error, setError] = useState(null);


  useEffect(() => {
    Promise.all([
      fetch("/data/jasper/jasper_dashboard_summary.json")
        .then((r) => {
          if (!r.ok) {
            throw new Error(
              `Jasper summary failed: ${r.status}`
            );
          }

          return r.json();
        }),

      fetch("/data/jasper/jasper_building_predictions.geojson")
        .then((r) => {
          if (!r.ok) {
            throw new Error(
              `Jasper buildings failed: ${r.status}`
            );
          }

          return r.json();
        }),
    ])
      .then(([summaryData, buildingData]) => {
        setSummary(summaryData);
        setBuildings(buildingData);
      })
      .catch((e) => setError(e.message));
  }, []);


  const features = buildings?.features || [];


  const mapCenter = useMemo(() => {
    if (!features.length) {
      return [52.875, -118.08];
    }

    const lat =
      features.reduce(
        (s, f) =>
          s + Number(f.properties.latitude || 0),
        0
      ) / features.length;

    const lon =
      features.reduce(
        (s, f) =>
          s + Number(f.properties.longitude || 0),
        0
      ) / features.length;

    return [lat, lon];
  }, [features]);


  const visibleFeatures = useMemo(() => {
    if (mode !== "Errors") {
      return features;
    }

    if (errorFilter === "All") {
      return features;
    }

    return features.filter(
      (f) =>
        f.properties.classification === errorFilter
    );
  }, [
    features,
    mode,
    errorFilter,
  ]);


  function markerColour(properties) {
    if (mode === "Risk") {
      return riskColour(
        properties.destroyed_probability
      );
    }

    if (mode === "Actual") {
      return binaryColour(
        properties.actual_label
      );
    }

    if (mode === "Predicted") {
      return binaryColour(
        properties.predicted_label
      );
    }

    return errorColour(
      properties.classification
    );
  }


  if (error) {
    return (
      <div className="error">
        Jasper wildfire data error: {error}
      </div>
    );
  }


  if (!summary || !buildings) {
    return (
      <div className="loading">
        Loading Jasper wildfire intelligence...
      </div>
    );
  }


  const event = summary.event;
  const model = summary.primary_model;
  const cm = summary.confusion_matrix;
  const comparison = summary.model_comparison;
  const uncertainty = summary.uncertainty;


  return (
    <>
      <section className="hero wildfire-hero">
        <div>
          <div className="eyebrow">
            WILDFIRE CATASTROPHE INTELLIGENCE
          </div>

          <h1>
            Jasper Wildfire Intelligence
          </h1>

          <p className="hero-copy">
            Building-level wildfire damage-risk intelligence
            combining localized fire exposure, fire-weather
            conditions, hotspot proximity, and pre-fire
            environmental context. Performance is evaluated
            using spatially held-out out-of-fold predictions.
          </p>

          <div className="data-badge wildfire-badge">
            Jasper 2024 · public-data research demonstrator
          </div>
        </div>

        <div className="event-chip">
          <span>Event</span>
          <strong>Jasper · 2024 wildfire</strong>
        </div>
      </section>


      <section className="kpi-grid">
        <div className="kpi-card">
          <span>Validated structures</span>
          <strong>
            {fmt(event.structures_evaluated)}
          </strong>
          <small>
            Validated structure-level outcomes
          </small>
        </div>

        <div className="kpi-card">
          <span>Destroyed structures</span>
          <strong>
            {fmt(event.destroyed)}
          </strong>
          <small>
            {pct(
              event.destroyed /
                event.structures_evaluated
            )}{" "}
            of validation cohort
          </small>
        </div>

        <div className="kpi-card">
          <span>Destroyed-building recall</span>
          <strong>
            {pct(model.destroyed_recall)}
          </strong>
          <small>
            208 of 240 destroyed structures detected
          </small>
        </div>

        <div className="kpi-card">
          <span>Balanced accuracy</span>
          <strong>
            {pct(model.balanced_accuracy)}
          </strong>
          <small>
            Frozen 250 m spatial validation
          </small>
        </div>
      </section>


      <section className="content-grid">
        <div className="panel map-panel">
          <div className="wildfire-map-heading">
            <div>
              <div className="eyebrow">
                BUILDING-LEVEL RISK MAP
              </div>

              <h2>
                Out-of-fold wildfire damage assessment
              </h2>
            </div>

            <div className="wildfire-map-modes">
              {[
                "Risk",
                "Actual",
                "Predicted",
                "Errors",
              ].map((name) => (
                <button
                  key={name}
                  className={
                    mode === name
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setMode(name);

                    if (name !== "Errors") {
                      setErrorFilter("All");
                    }
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>


          {mode === "Errors" && (
            <div className="wildfire-error-filters">
              {[
                "All",
                "TP",
                "TN",
                "FP",
                "FN",
              ].map((name) => (
                <button
                  key={name}
                  className={
                    errorFilter === name
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setErrorFilter(name)
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          )}


          <div className="wildfire-map-legend">
            {mode === "Risk" && (
              <>
                <span>
                  Lower destruction probability
                </span>

                <div className="wildfire-risk-gradient" />

                <span>Higher</span>
              </>
            )}

            {mode === "Actual" && (
              <>
                <span className="wildfire-legend-item">
                  <i className="legend-survived" />
                  Survived
                </span>

                <span className="wildfire-legend-item">
                  <i className="legend-destroyed" />
                  Destroyed
                </span>
              </>
            )}

            {mode === "Predicted" && (
              <>
                <span className="wildfire-legend-item">
                  <i className="legend-survived" />
                  Predicted survived
                </span>

                <span className="wildfire-legend-item">
                  <i className="legend-destroyed" />
                  Predicted destroyed
                </span>
              </>
            )}

            {mode === "Errors" && (
              <>
                <span className="wildfire-legend-item">
                  <i className="legend-tp" />
                  TP
                </span>

                <span className="wildfire-legend-item">
                  <i className="legend-tn" />
                  TN
                </span>

                <span className="wildfire-legend-item">
                  <i className="legend-fp" />
                  FP
                </span>

                <span className="wildfire-legend-item">
                  <i className="legend-fn" />
                  FN
                </span>
              </>
            )}
          </div>


          <MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom={true}
            preferCanvas={true}
            className="wildfire-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {visibleFeatures.map((feature) => {
              const p = feature.properties;

              const probability = Number(
                p.destroyed_probability || 0
              );

              return (
                <CircleMarker
                  key={p.sequence_id}
                  center={[
                    Number(p.latitude),
                    Number(p.longitude),
                  ]}
                  radius={
                    p.high_confidence_error
                      ? 7
                      : 5
                  }
                  pathOptions={{
                    color: "#ffffff",
                    weight:
                      p.high_confidence_error
                        ? 1.8
                        : 0.8,
                    fillColor:
                      markerColour(p),
                    fillOpacity: 0.86,
                  }}
                >
                  <Popup>
                    <div className="popup wildfire-popup">
                      <strong>
                        Structure {p.sequence_id}
                      </strong>

                      <div>
                        Actual:{" "}
                        <b>{p.actual_label}</b>
                      </div>

                      <div>
                        Predicted:{" "}
                        <b>{p.predicted_label}</b>
                      </div>

                      <div>
                        Destruction probability:{" "}
                        <b>
                          {pct(probability)}
                        </b>
                      </div>

                      <div>
                        Classification:{" "}
                        <b>{p.classification}</b>
                      </div>

                      <div>
                        Decision margin:{" "}
                        {Number(
                          p.decision_confidence || 0
                        ).toFixed(3)}
                      </div>

                      <div>
                        Context effect:{" "}
                        {p.context_effect}
                      </div>

                      {p.high_confidence_error && (
                        <div className="wildfire-popup-warning">
                          High-confidence error
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>


          <div className="map-note">
            Every point is an out-of-fold prediction:
            the model displayed for a building was trained
            without that building's 250 m spatial validation
            group. Risk mode shows predicted destruction
            probability; Actual and Predicted modes show
            binary outcomes; Errors shows TP/TN/FP/FN
            diagnostic classes.
          </div>
        </div>


        <div className="right-column">
          <div className="panel">
            <div className="eyebrow">
              MODEL PERFORMANCE
            </div>

            <h2>
              Spatially held-out validation
            </h2>

            <div className="wildfire-metric-grid">
              <MetricBox
                label="Balanced accuracy"
                value={model.balanced_accuracy.toFixed(
                  3
                )}
              />

              <MetricBox
                label="ROC-AUC"
                value={model.roc_auc.toFixed(3)}
              />

              <MetricBox
                label="Average precision"
                value={model.average_precision.toFixed(
                  3
                )}
              />

              <MetricBox
                label="F1"
                value={model.f1.toFixed(3)}
              />
            </div>

            <p className="interpretation">
              The primary model combines localized wildfire
              exposure with non-terrain pre-fire context.
              Terrain was retained only as a sensitivity
              analysis because it can behave as a geographic
              proxy within a single event.
            </p>
          </div>


          <div className="panel">
            <div className="eyebrow">
              CLASSIFICATION OUTCOMES
            </div>

            <h2>
              Where the model succeeds and fails
            </h2>

            <div className="wildfire-error-grid">
              <ErrorBox
                label="True positive"
                value={cm.true_positive}
                tone="tp"
                note="Destroyed and detected"
              />

              <ErrorBox
                label="True negative"
                value={cm.true_negative}
                tone="tn"
                note="Survived and correctly screened"
              />

              <ErrorBox
                label="False positive"
                value={cm.false_positive}
                tone="fp"
                note="False alarm"
              />

              <ErrorBox
                label="False negative"
                value={cm.false_negative}
                tone="fn"
                note="Destroyed but missed"
              />
            </div>

            <div className="wildfire-screening-note">
              <strong>
                Risk-screening behaviour
              </strong>

              <p>
                The model detected{" "}
                {pct(model.destroyed_recall)} of
                destroyed structures, while specificity
                for surviving structures was{" "}
                {pct(model.survived_specificity)}.
                The operating point therefore prioritizes
                identifying damaged structures at the
                expense of additional false alarms.
              </p>
            </div>
          </div>
        </div>
      </section>


      <section className="wildfire-secondary-grid">
        <div className="panel">
          <div className="eyebrow">
            CONTEXTUAL INTELLIGENCE
          </div>

          <h2>
            Does pre-fire context add value?
          </h2>

          <div className="wildfire-model-comparison">
            <div>
              <span>
                Hazard-only balanced accuracy
              </span>

              <strong>
                {pct(
                  comparison.hazard_only_balanced_accuracy
                )}
              </strong>

              <small>
                Localized wildfire exposure alone
              </small>
            </div>

            <div className="wildfire-comparison-arrow">
              →
            </div>

            <div className="highlight">
              <span>
                Hazard + contextual intelligence
              </span>

              <strong>
                {pct(
                  comparison.combined_balanced_accuracy
                )}
              </strong>

              <small>
                Localized exposure + non-terrain
                pre-fire context
              </small>
            </div>
          </div>

          <div className="wildfire-context-counts">
            <div>
              <span>
                Hazard-only errors corrected
              </span>

              <strong>
                {fmt(
                  comparison.context_fixed_hazard_only_errors
                )}
              </strong>
            </div>

            <div>
              <span>
                New errors introduced
              </span>

              <strong>
                {fmt(
                  comparison.context_introduced_errors
                )}
              </strong>
            </div>
          </div>
        </div>


        <div className="panel">
          <div className="eyebrow">
            UNCERTAINTY & ROBUSTNESS
          </div>

          <h2>
            Spatial-cluster bootstrap
          </h2>

          <div className="wildfire-bootstrap-grid">
            <div>
              <span>Resamples</span>

              <strong>
                {fmt(
                  uncertainty.bootstrap_replicates
                )}
              </strong>
            </div>

            <div>
              <span>
                Mean BA improvement
              </span>

              <strong>
                +
                {(
                  uncertainty
                    .balanced_accuracy_improvement_mean *
                  100
                ).toFixed(1)}
                pp
              </strong>
            </div>

            <div>
              <span>
                Resamples favouring combined model
              </span>

              <strong>
                {pct(
                  uncertainty
                    .probability_combined_model_better_ba
                )}
              </strong>
            </div>

            <div>
              <span>
                F1 resamples favouring combined model
              </span>

              <strong>
                {pct(
                  uncertainty
                    .probability_combined_model_better_f1
                )}
              </strong>
            </div>
          </div>

          <p className="interpretation">
            Spatial groups, rather than individual
            buildings, were resampled to preserve
            neighbourhood correlation. The 95% interval
            for the performance difference slightly
            overlaps zero, so this is evidence of a
            robust tendency toward improvement rather
            than definitive proof of superiority.
          </p>
        </div>
      </section>


      <section className="panel wildfire-workflow">
        <div>
          <div className="eyebrow">
            DECISION-SUPPORT PIPELINE
          </div>

          <h2>
            From wildfire observations to building-level intelligence
          </h2>
        </div>

        <div className="wildfire-flow-grid">
          <div>
            <span>01</span>
            <strong>Fire environment</strong>
            <small>
              CWFIS fire-weather indices, hotspot
              observations and meteorology
            </small>
          </div>

          <div>
            <span>02</span>
            <strong>Localized exposure</strong>
            <small>
              Distance-, wind- and neighbourhood-weighted
              wildfire intensity features
            </small>
          </div>

          <div>
            <span>03</span>
            <strong>Pre-fire context</strong>
            <small>
              Building density, Sentinel-2 vegetation and
              environmental characteristics
            </small>
          </div>

          <div>
            <span>04</span>
            <strong>Spatial validation</strong>
            <small>
              Frozen 3-fold, 250 m grouped
              out-of-fold evaluation
            </small>
          </div>

          <div>
            <span>05</span>
            <strong>Risk intelligence</strong>
            <small>
              Building-level probability, uncertainty,
              error cohorts and map delivery
            </small>
          </div>
        </div>
      </section>


      <section className="disclaimer">
        <strong>
          Demonstration scope
        </strong>

        <span>
          This is a public-data research and
          decision-support demonstrator, not an insurance
          claim determination or universal wildfire-loss
          model. Validation is based on a single 2024
          Jasper wildfire event. Production deployment
          would require additional fire events, insurer
          exposure and claims data, property attributes,
          and insurer-specific calibration.
        </span>
      </section>
    </>
  );
}
