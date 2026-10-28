package com.stego.backend.security;

import com.stego.backend.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The /ws endpoint is public so SockJS can connect, which means the broker itself has to check who may
 * listen to what: a CONNECT must carry a valid JWT, and a SUBSCRIBE is only allowed to the user's own
 * order topic or to the order topic of a restaurant they own.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern USER_TOPIC = Pattern.compile("^/topic/user/(\\d+)/.*");
    private static final Pattern RESTAURANT_TOPIC = Pattern.compile("^/topic/restaurant/(\\d+)/.*");

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        if (accessor.getCommand() == StompCommand.CONNECT) {
            accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
        } else if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            if (!maySubscribe(accessor.getUser(), accessor.getDestination())) {
                throw new MessageDeliveryException("Not allowed to subscribe to " + accessor.getDestination());
            }
        } else if (accessor.getCommand() == StompCommand.SEND) {
            // nothing in the app accepts client messages; only the server publishes order updates
            throw new MessageDeliveryException("Clients cannot publish messages");
        }
        return message;
    }

    private Principal authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Missing bearer token");
        }
        String jwt = header.substring(7);
        if (!jwtUtils.validateJwtToken(jwt)) {
            throw new MessageDeliveryException("Invalid or expired token");
        }
        UserDetails user = userDetailsService.loadUserByUsername(jwtUtils.getEmailFromJwtToken(jwt));
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }

    boolean maySubscribe(Principal principal, String destination) {
        if (!(principal instanceof UsernamePasswordAuthenticationToken auth)
                || !(auth.getPrincipal() instanceof UserDetailsImpl user) || destination == null) {
            return false;
        }
        Matcher m = USER_TOPIC.matcher(destination);
        if (m.matches()) {
            return user.getId().equals(Long.valueOf(m.group(1)));
        }
        m = RESTAURANT_TOPIC.matcher(destination);
        if (m.matches()) {
            return restaurantRepository.findById(Long.valueOf(m.group(1)))
                    .map(r -> r.getOwner() != null && user.getId().equals(r.getOwner().getId()))
                    .orElse(false);
        }
        return false;
    }
}
