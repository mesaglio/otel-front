package exporter

import (
	"time"

	"github.com/mesaglio/otel-front/internal/store"
	"go.opentelemetry.io/collector/pdata/pmetric"
)

// TransformMetrics converts OTLP metrics to internal metric model
func TransformMetrics(md pmetric.Metrics) ([]*store.MetricRecord, error) {
	metrics := make([]*store.MetricRecord, 0)

	// Iterate through resource metrics
	for i := 0; i < md.ResourceMetrics().Len(); i++ {
		rm := md.ResourceMetrics().At(i)
		resourceAttrs := attributesToMap(rm.Resource().Attributes())
		serviceName := extractServiceName(resourceAttrs)

		// Iterate through scope metrics
		for j := 0; j < rm.ScopeMetrics().Len(); j++ {
			sm := rm.ScopeMetrics().At(j)

			// Iterate through metrics
			for k := 0; k < sm.Metrics().Len(); k++ {
				metric := sm.Metrics().At(k)
				metricName := metric.Name()

				// Convert based on metric type
				switch metric.Type() {
				case pmetric.MetricTypeGauge:
					metrics = append(metrics, transformGauge(metric.Gauge(), metricName, serviceName, resourceAttrs)...)
				case pmetric.MetricTypeSum:
					metrics = append(metrics, transformSum(metric.Sum(), metricName, serviceName, resourceAttrs)...)
				case pmetric.MetricTypeHistogram:
					metrics = append(metrics, transformHistogram(metric.Histogram(), metricName, serviceName, resourceAttrs)...)
				case pmetric.MetricTypeExponentialHistogram:
					metrics = append(metrics, transformExponentialHistogram(metric.ExponentialHistogram(), metricName, serviceName, resourceAttrs)...)
				case pmetric.MetricTypeSummary:
					metrics = append(metrics, transformSummary(metric.Summary(), metricName, serviceName, resourceAttrs)...)
				}
			}
		}
	}

	return metrics, nil
}

// transformGauge converts gauge metric to metric records
func transformGauge(gauge pmetric.Gauge, metricName, serviceName string, resourceAttrs map[string]interface{}) []*store.MetricRecord {
	records := make([]*store.MetricRecord, 0, gauge.DataPoints().Len())

	for i := 0; i < gauge.DataPoints().Len(); i++ {
		dp := gauge.DataPoints().At(i)
		value := extractNumericValue(dp)

		record := &store.MetricRecord{
			Timestamp:  time.Unix(0, int64(dp.Timestamp())),
			MetricName: metricName,
			MetricType: "gauge",
			ServiceName: serviceName,
			Value:      &value,
			Attributes: mergeAttributes(resourceAttrs, attributesToMap(dp.Attributes())),
			Exemplars:  convertExemplars(dp.Exemplars()),
		}

		records = append(records, record)
	}

	return records
}

// transformSum converts sum metric to metric records
func transformSum(sum pmetric.Sum, metricName, serviceName string, resourceAttrs map[string]interface{}) []*store.MetricRecord {
	records := make([]*store.MetricRecord, 0, sum.DataPoints().Len())

	for i := 0; i < sum.DataPoints().Len(); i++ {
		dp := sum.DataPoints().At(i)
		value := extractNumericValue(dp)

		record := &store.MetricRecord{
			Timestamp:  time.Unix(0, int64(dp.Timestamp())),
			MetricName: metricName,
			MetricType: "sum",
			ServiceName: serviceName,
			Value:      &value,
			Attributes: mergeAttributes(resourceAttrs, attributesToMap(dp.Attributes())),
			Exemplars:  convertExemplars(dp.Exemplars()),
		}

		records = append(records, record)
	}

	return records
}

// transformHistogram converts histogram metric to metric records
func transformHistogram(hist pmetric.Histogram, metricName, serviceName string, resourceAttrs map[string]interface{}) []*store.MetricRecord {
	records := make([]*store.MetricRecord, 0, hist.DataPoints().Len())

	for i := 0; i < hist.DataPoints().Len(); i++ {
		dp := hist.DataPoints().At(i)

		// Store histogram data in attributes
		attrs := attributesToMap(dp.Attributes())
		attrs["count"] = dp.Count()
		attrs["sum"] = dp.Sum()

		// Store bucket counts
		buckets := make([]map[string]interface{}, 0, dp.BucketCounts().Len())
		for j := 0; j < dp.BucketCounts().Len(); j++ {
			bucket := map[string]interface{}{
				"count": dp.BucketCounts().At(j),
			}
			if j < dp.ExplicitBounds().Len() {
				bucket["upper_bound"] = dp.ExplicitBounds().At(j)
			}
			buckets = append(buckets, bucket)
		}
		attrs["buckets"] = buckets

		// Use sum as the value
		value := dp.Sum()

		record := &store.MetricRecord{
			Timestamp:  time.Unix(0, int64(dp.Timestamp())),
			MetricName: metricName,
			MetricType: "histogram",
			ServiceName: serviceName,
			Value:      &value,
			Attributes: mergeAttributes(resourceAttrs, attrs),
			Exemplars:  convertExemplars(dp.Exemplars()),
		}

		records = append(records, record)
	}

	return records
}

// transformExponentialHistogram converts exponential histogram metric to metric records
func transformExponentialHistogram(hist pmetric.ExponentialHistogram, metricName, serviceName string, resourceAttrs map[string]interface{}) []*store.MetricRecord {
	records := make([]*store.MetricRecord, 0, hist.DataPoints().Len())

	for i := 0; i < hist.DataPoints().Len(); i++ {
		dp := hist.DataPoints().At(i)

		// Store exponential histogram data in attributes
		attrs := attributesToMap(dp.Attributes())
		attrs["count"] = dp.Count()
		attrs["sum"] = dp.Sum()
		attrs["scale"] = dp.Scale()

		// Use sum as the value
		value := dp.Sum()

		record := &store.MetricRecord{
			Timestamp:  time.Unix(0, int64(dp.Timestamp())),
			MetricName: metricName,
			MetricType: "exponential_histogram",
			ServiceName: serviceName,
			Value:      &value,
			Attributes: mergeAttributes(resourceAttrs, attrs),
			Exemplars:  convertExemplars(dp.Exemplars()),
		}

		records = append(records, record)
	}

	return records
}

// transformSummary converts summary metric to metric records
func transformSummary(summary pmetric.Summary, metricName, serviceName string, resourceAttrs map[string]interface{}) []*store.MetricRecord {
	records := make([]*store.MetricRecord, 0, summary.DataPoints().Len())

	for i := 0; i < summary.DataPoints().Len(); i++ {
		dp := summary.DataPoints().At(i)

		// Store summary data in attributes
		attrs := attributesToMap(dp.Attributes())
		attrs["count"] = dp.Count()
		attrs["sum"] = dp.Sum()

		// Store quantile values
		quantiles := make([]map[string]interface{}, 0, dp.QuantileValues().Len())
		for j := 0; j < dp.QuantileValues().Len(); j++ {
			qv := dp.QuantileValues().At(j)
			quantiles = append(quantiles, map[string]interface{}{
				"quantile": qv.Quantile(),
				"value":    qv.Value(),
			})
		}
		attrs["quantiles"] = quantiles

		// Use sum as the value
		value := dp.Sum()

		record := &store.MetricRecord{
			Timestamp:  time.Unix(0, int64(dp.Timestamp())),
			MetricName: metricName,
			MetricType: "summary",
			ServiceName: serviceName,
			Value:      &value,
			Attributes: mergeAttributes(resourceAttrs, attrs),
		}

		records = append(records, record)
	}

	return records
}

// extractNumericValue extracts numeric value from data point
func extractNumericValue(dp pmetric.NumberDataPoint) float64 {
	switch dp.ValueType() {
	case pmetric.NumberDataPointValueTypeInt:
		return float64(dp.IntValue())
	case pmetric.NumberDataPointValueTypeDouble:
		return dp.DoubleValue()
	default:
		return 0
	}
}

// convertExemplars converts OTLP exemplars to internal exemplar model
func convertExemplars(exemplars pmetric.ExemplarSlice) []store.Exemplar {
	if exemplars.Len() == 0 {
		return nil
	}

	result := make([]store.Exemplar, 0, exemplars.Len())
	for i := 0; i < exemplars.Len(); i++ {
		ex := exemplars.At(i)

		value := 0.0
		switch ex.ValueType() {
		case pmetric.ExemplarValueTypeInt:
			value = float64(ex.IntValue())
		case pmetric.ExemplarValueTypeDouble:
			value = ex.DoubleValue()
		}

		exemplar := store.Exemplar{
			Value:      value,
			Timestamp:  time.Unix(0, int64(ex.Timestamp())),
			TraceID:    ex.TraceID().String(),
			SpanID:     ex.SpanID().String(),
			Attributes: attributesToMap(ex.FilteredAttributes()),
		}

		result = append(result, exemplar)
	}

	return result
}
