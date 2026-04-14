package com.crm.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ configuration for async messaging
 */
@Configuration
public class RabbitMQConfig {

    public static final String EMBEDDING_QUEUE = "crm.embedding.queue";
    public static final String EMAIL_QUEUE = "crm.email.queue";
    public static final String REPORT_QUEUE = "crm.report.queue";
    public static final String NOTIFICATION_QUEUE = "crm.notification.queue";
    
    public static final String CRM_EXCHANGE = "crm.exchange";

    @Bean
    public Queue embeddingQueue() {
        return QueueBuilder.durable(EMBEDDING_QUEUE)
                .withArgument("x-dead-letter-exchange", "crm.dlx")
                .withArgument("x-message-ttl", 3600000) // 1 hour
                .build();
    }

    @Bean
    public Queue emailQueue() {
        return QueueBuilder.durable(EMAIL_QUEUE)
                .withArgument("x-dead-letter-exchange", "crm.dlx")
                .withArgument("x-message-ttl", 300000) // 5 minutes
                .build();
    }

    @Bean
    public Queue reportQueue() {
        return QueueBuilder.durable(REPORT_QUEUE)
                .withArgument("x-dead-letter-exchange", "crm.dlx")
                .withArgument("x-message-ttl", 1800000) // 30 minutes
                .build();
    }

    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE)
                .withArgument("x-dead-letter-exchange", "crm.dlx")
                .withArgument("x-message-ttl", 60000) // 1 minute
                .build();
    }

    @Bean
    public TopicExchange crmExchange() {
        return new TopicExchange(CRM_EXCHANGE);
    }

    @Bean
    public Binding embeddingBinding() {
        return BindingBuilder.bind(embeddingQueue())
                .to(crmExchange())
                .with("crm.embedding.*");
    }

    @Bean
    public Binding emailBinding() {
        return BindingBuilder.bind(emailQueue())
                .to(crmExchange())
                .with("crm.email.*");
    }

    @Bean
    public Binding reportBinding() {
        return BindingBuilder.bind(reportQueue())
                .to(crmExchange())
                .with("crm.report.*");
    }

    @Bean
    public Binding notificationBinding() {
        return BindingBuilder.bind(notificationQueue())
                .to(crmExchange())
                .with("crm.notification.*");
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory
    ) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter());
        factory.setConcurrentConsumers(3);
        factory.setMaxConcurrentConsumers(10);
        factory.setPrefetchCount(5);
        return factory;
    }
}
