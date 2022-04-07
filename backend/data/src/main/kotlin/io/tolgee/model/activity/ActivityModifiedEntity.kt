package io.tolgee.model.activity

import com.vladmihalcea.hibernate.type.json.JsonBinaryType
import io.tolgee.activity.EntityDescriptionRef
import io.tolgee.activity.PropertyModification
import io.tolgee.activity.RevisionType
import org.hibernate.annotations.Type
import org.hibernate.annotations.TypeDef
import org.hibernate.annotations.TypeDefs
import java.io.Serializable
import javax.persistence.Entity
import javax.persistence.Enumerated
import javax.persistence.Id
import javax.persistence.IdClass
import javax.persistence.ManyToOne

@Entity
@TypeDefs(
  value = [TypeDef(name = "jsonb", typeClass = JsonBinaryType::class)]
)
@IdClass(ActivityModifiedEntityId::class)
class ActivityModifiedEntity(
  @ManyToOne
  @Id
  val activityRevision: ActivityRevision,

  @Id
  val entityClass: String,

  @Id
  val entityId: Long
) : Serializable {

  @Type(type = "jsonb")
  var modifications: MutableMap<String, PropertyModification> = mutableMapOf()

  @Type(type = "jsonb")
  var description: Map<String, Any?>? = null

  @Type(type = "jsonb")
  var describingRelations: Map<String, EntityDescriptionRef>? = null

  @Enumerated
  lateinit var revisionType: RevisionType
}
