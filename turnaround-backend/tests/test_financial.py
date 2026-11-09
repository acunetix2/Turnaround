from app.engines.financial import calculate_delay_cost, calculate_excess_minutes, calculate_financial_loss


def test_calculate_excess_minutes_clamps_at_zero():
    assert calculate_excess_minutes(120, 180) == 0.0
    assert calculate_excess_minutes(180, 120) == 60.0


def test_financial_loss_uses_the_required_formula():
    assert calculate_financial_loss(180, 120, 3000) == 3000.0
    assert calculate_financial_loss(60, 120, 3000) == 0.0


def test_delay_cost_uses_excess_hours_times_hourly_rate():
    assert calculate_delay_cost(90, 3000) == 4500.0
    assert calculate_delay_cost(0, 3000) == 0.0
