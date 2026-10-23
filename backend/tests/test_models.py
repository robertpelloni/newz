def test_models_import():
    import backend.models
    assert backend.models.Source is not None
    assert backend.models.Article is not None
    assert backend.models.Topic is not None
    assert backend.models.ArticleTopic is not None
    assert backend.models.Discussion is not None
    assert backend.models.Sentiment is not None
